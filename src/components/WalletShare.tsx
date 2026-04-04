import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { isEthereumWallet } from "@dynamic-labs/ethereum";
import { useEffect, useMemo, useState } from "react";

declare global {
    interface Window {
        render?: (value: string, canvasId: string) => void;
    }
}

function shortenAddress(address: string, left = 6, right = 4) {
    if (!address) return "";
    return `${address.slice(0, left)}...${address.slice(-right)}`;
}

export function WalletShareCard() {
    const { primaryWallet } = useDynamicContext();

    const [address, setAddress] = useState("");
    const [previewUrl, setPreviewUrl] = useState("");
    const [status, setStatus] = useState("Loading wallet...");
    const [copied, setCopied] = useState(false);
    const [sharing, setSharing] = useState(false);

    const canvasId = "share-wallet-canvas";

    const isReadyWallet = useMemo(() => {
        return !!primaryWallet && isEthereumWallet(primaryWallet);
    }, [primaryWallet]);

    useEffect(() => {
        let cancelled = false;

        async function loadAddress() {
            if (!primaryWallet || !isEthereumWallet(primaryWallet)) {
                setAddress("");
                setStatus("Connect an Ethereum wallet");
                return;
            }

            try {
                const walletAddress = primaryWallet.address;
                if (cancelled) return;
                setAddress(walletAddress);
                setStatus("Ready");
            } catch (error) {
                console.error(error);
                if (!cancelled) {
                    setStatus(error instanceof Error ? error.message : "Wallet error");
                }
            }
        }

        loadAddress();

        return () => {
            cancelled = true;
        };
    }, [primaryWallet]);

    useEffect(() => {
        if (!address) return;
        if (typeof window.render !== "function") {
            setStatus("window.render is not available");
            return;
        }

        try {
            window.render(address, canvasId);

            window.setTimeout(() => {
                const sourceCanvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
                if (!sourceCanvas) {
                    setStatus(`Canvas #${canvasId} not found`);
                    return;
                }

                const out = document.createElement("canvas");
                out.width = 256;
                out.height = 256;

                const ctx = out.getContext("2d");
                if (!ctx) {
                    setStatus("Cannot create preview canvas");
                    return;
                }

                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(sourceCanvas, 0, 0, 256, 256);

                setPreviewUrl(out.toDataURL("image/png"));
            }, 0);
        } catch (error) {
            console.error(error);
            setStatus(error instanceof Error ? error.message : "Render error");
        }
    }, [address]);

    async function handleCopy() {
        if (!address) return;
        await navigator.clipboard.writeText(address);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
    }

    async function handleShare() {
        if (!address) return;

        try {
            setSharing(true);

            if (navigator.share) {
                await navigator.share({
                    title: "My wallet address",
                    text: `My wallet address: ${address}`,
                });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSharing(false);
        }
    }

    function handleDownload() {
        if (!previewUrl || !address) return;

        const a = document.createElement("a");
        a.href = previewUrl;
        a.download = `wallet-${address}.png`;
        a.click();
    }

    return (
        <div className="w-full max-w-[800px] mx-auto rounded-2xl border p-6 space-y-6 shadow-sm">
            <div className="space-y-1">
                <h2 className="text-2xl font-semibold">Share wallet</h2>
                <p className="text-sm opacity-70">{status}</p>
            </div>

            {!isReadyWallet ? (
                <div className="rounded-xl border p-4">
                    Connect an Ethereum wallet with Dynamic first.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 items-start">
                    <div className="rounded-2xl border p-4 flex flex-col items-center gap-4">
                        <canvas
                            id={canvasId}
                            width={64}
                            height={64}
                            className="hidden"
                        />

                        {previewUrl ? (
                            <img
                                src={previewUrl}
                                alt="Wallet preview"
                                className="w-[128px] h-[128px] rounded-xl border bg-white object-contain"
                            />
                        ) : (
                            <div className="w-[128px] h-[128px] rounded-xl border bg-white flex items-center justify-center text-sm opacity-60">
                                No preview
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="rounded-xl border p-4 space-y-2">
                            <div className="text-sm opacity-70">Primary wallet address</div>
                            <div className="text-lg font-medium break-all">{address || "-"}</div>
                            <div className="text-sm opacity-60">{shortenAddress(address)}</div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={handleCopy}
                                className="rounded-xl border px-4 py-2"
                            >
                                {copied ? "Copied" : "Copy address"}
                            </button>

                            <button
                                type="button"
                                onClick={handleShare}
                                disabled={sharing}
                                className="rounded-xl border px-4 py-2 disabled:opacity-50"
                            >
                                {sharing ? "Sharing..." : "Share"}
                            </button>

                            <button
                                type="button"
                                onClick={handleDownload}
                                disabled={!previewUrl}
                                className="rounded-xl border px-4 py-2 disabled:opacity-50"
                            >
                                Download image
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}