// hooks/useDynamicFaceInjector.ts
import { useEffect, useRef } from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

declare global {
    interface Window {
        render: (address: string, canvasId: string) => void;
        ethereum?: any;
    }
}

function renderFaceImg(address: string): HTMLImageElement | null {
    const canvasId = "dynamic-face-canvas";
    let canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.id = canvasId;
        canvas.width = 64;
        canvas.height = 64;
        canvas.style.display = "none";
        document.body.appendChild(canvas);
    }
    try {
        window.render(address, canvasId);
    } catch {
        return null;
    }
    const scaled = document.createElement("canvas");
    scaled.width = scaled.height = 72;
    const ctx = scaled.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(canvas, 0, 0, 72, 72);
    const img = document.createElement("img");
    img.src = scaled.toDataURL("image/png");
    img.width = 48;
    img.height = 48;
    img.style.cssText = "image-rendering:pixelated;border-radius:8px;flex-shrink:0;";
    return img;
}

function tryInject(shadowRoot: ShadowRoot, address: string) {
    if (shadowRoot.querySelector("#wallet-face-injected")) return;
    const container = shadowRoot.querySelector(".transaction-card-container");
    if (!container) return;
    const cards = container.querySelectorAll(".transaction-card");
    if (cards.length < 2) return;

    const img = renderFaceImg(address);
    if (!img) return;

    const wrapper = document.createElement("div");
    wrapper.id = "wallet-face-injected";
    wrapper.style.cssText = `
    display:flex;align-items:center;gap:10px;
    padding:8px 12px;
    background:var(--dynamic-base-2);
    border-radius:10px;
    border:1px solid var(--dynamic-base-3);
  `;

    const textBlock = document.createElement("div");
    textBlock.style.cssText = "display:flex;flex-direction:column;gap:2px;";

    const label = document.createElement("span");
    label.textContent = "Visual address check";
    label.style.cssText = "font-size:11px;color:var(--dynamic-text-secondary);font-family:var(--dynamic-font-family-primary);";

    const addr = document.createElement("span");
    addr.textContent = `${address.slice(0, 6)}...${address.slice(-4)}`;
    addr.style.cssText = "font-size:12px;font-weight:600;color:var(--dynamic-text-primary);font-family:var(--dynamic-font-family-primary);";

    textBlock.appendChild(label);
    textBlock.appendChild(addr);
    wrapper.appendChild(img);
    wrapper.appendChild(textBlock);
    container.insertBefore(wrapper, cards[1]);
    console.log("[FaceInjector] ✅ injected for", address);
}

// Dans useDynamicFaceInjector.ts, ajoute cette fonction

function tryInjectQrLogo(shadowRoot: ShadowRoot, address: string) {
    if (shadowRoot.querySelector("#wallet-face-qr")) return;

    // Le logo centré dans le QR code
    const qrIcon = shadowRoot.querySelector(".qrcode__icon");
    if (!qrIcon) return;

    // Render face
    const canvasId = "dynamic-face-canvas-qr";
    let canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.id = canvasId;
        canvas.width = 64;
        canvas.height = 64;
        canvas.style.display = "none";
        document.body.appendChild(canvas);
    }

    try {
        window.render(address, canvasId);
    } catch {
        return;
    }

    // Scale to the icon size (~40px)
    const scaled = document.createElement("canvas");
    scaled.width = scaled.height = 40;
    const ctx = scaled.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(canvas, 0, 0, 40, 40);

    const img = document.createElement("img");
    img.id = "wallet-face-qr";
    img.src = scaled.toDataURL("image/png");
    img.style.cssText = `
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 40px; height: 40px;
    image-rendering: pixelated;
    border-radius: 6px;
    border: 2px solid var(--dynamic-base-1);
    background: var(--dynamic-base-1);
  `;

    // Hide the original Dynamic logo, insert ours
    (qrIcon as HTMLElement).style.display = "none";
    qrIcon.parentElement?.appendChild(img);

    console.log("[FaceInjector] ✅ QR logo injected for", address);
}

export function useDynamicFaceInjector() {
    const { primaryWallet } = useDynamicContext();
    const recipientRef = useRef<string | null>(null);
    const innerObserversRef = useRef<MutationObserver[]>([]);
    const walletAddressRef = useRef<string | null>(null);

    const setRecipient = (addr: string) => {
        recipientRef.current = addr;
    };

    useEffect(() => {
        walletAddressRef.current = primaryWallet?.address ?? null;
    }, [primaryWallet]);


    // Patch window.ethereum directly — Dynamic's viem transport uses it under the hood
    useEffect(() => {
        if (!window.ethereum) {
            console.warn("[FaceInjector] window.ethereum not found");
            return;
        }

        const orig = window.ethereum.request.bind(window.ethereum);

        window.ethereum.request = async (args: any) => {
            if (
                args.method === "eth_estimateGas" ||
                args.method === "eth_sendTransaction"
            ) {
                const to = args.params?.[0]?.to;
                if (to) {
                    console.log("[FaceInjector] captured recipient from", args.method, ":", to);
                    recipientRef.current = to;
                }
            }
            return orig(args);
        };

        return () => {
            window.ethereum.request = orig;
        };
    }, [primaryWallet]);

    // Watch for shadow host + inject inside
    useEffect(() => {
        const docObserver = new MutationObserver(() => {
            const hosts = document.querySelectorAll('[data-testid="dynamic-modal-shadow"]');

            hosts.forEach((host) => {
                const shadowRoot = host.shadowRoot;
                if (!shadowRoot) return;

                const alreadyWatched = innerObserversRef.current.some(
                    (o: any) => o._shadowRoot === shadowRoot
                );
                if (alreadyWatched) return;

                const inner = new MutationObserver(() => {
                    if (recipientRef.current) tryInject(shadowRoot, recipientRef.current);
                    if (walletAddressRef.current) tryInjectQrLogo(shadowRoot, walletAddressRef.current);

                });
                (inner as any)._shadowRoot = shadowRoot;
                inner.observe(shadowRoot, { childList: true, subtree: true });
                innerObserversRef.current.push(inner);

                if (recipientRef.current) tryInject(shadowRoot, recipientRef.current);
                if (walletAddressRef.current) tryInjectQrLogo(shadowRoot, walletAddressRef.current);
            });

            if (hosts.length === 0 && innerObserversRef.current.length > 0) {
                innerObserversRef.current.forEach((o) => o.disconnect());
                innerObserversRef.current = [];
                recipientRef.current = null;
                document.getElementById("dynamic-face-canvas")?.remove();
                document.getElementById("dynamic-face-canvas-qr")?.remove(); // ← ajoute ça
            }
        });

        docObserver.observe(document.body, { childList: true, subtree: true });

        return () => {
            docObserver.disconnect();
            innerObserversRef.current.forEach((o) => o.disconnect());
            innerObserversRef.current = [];
            document.getElementById("dynamic-face-canvas")?.remove();
        };
    }, []);
    return { setRecipient };

}