import { FormEvent, useMemo, useState } from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { isEthereumWallet } from "@dynamic-labs/ethereum";
import { formatEther, isAddress, parseEther } from "viem";
import { WalletShareCard } from "./WalletShare";

type SendEthProps = {
    defaultRecipient?: string;
    defaultAmount?: string;
};

export function SendEthWithDynamic({
    defaultRecipient = "",
    defaultAmount = "",
}: SendEthProps) {
    const { primaryWallet } = useDynamicContext();

    const [recipient, setRecipient] = useState(defaultRecipient);
    const [amount, setAmount] = useState(defaultAmount);
    const [txHash, setTxHash] = useState("");
    const [status, setStatus] = useState<
        "idle" | "sending" | "waiting_receipt" | "success" | "error"
    >("idle");
    const [error, setError] = useState("");
    const [explorerUrl, setExplorerUrl] = useState("");
    const [walletAddress, setWalletAddress] = useState("");
    const [balance, setBalance] = useState("");

    const isReady = useMemo(
        () => !!primaryWallet && isEthereumWallet(primaryWallet),
        [primaryWallet]
    );

    const loadWalletInfo = async () => {
        if (!primaryWallet || !isEthereumWallet(primaryWallet)) return;

        try {
            const publicClient = await primaryWallet.getPublicClient();
            const account = primaryWallet.address;
            const currentBalance = await publicClient.getBalance({
                address: account as `0x${string}`,
            });

            setWalletAddress(account);
            setBalance(formatEther(currentBalance));
        } catch (err) {
            console.error(err);
        }
    };

    const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");
        setTxHash("");
        setExplorerUrl("");
        setStatus("idle");

        if (!primaryWallet || !isEthereumWallet(primaryWallet)) {
            setError("No Ethereum wallet is connected.");
            return;
        }

        if (!isAddress(recipient)) {
            setError("Recipient address is invalid.");
            return;
        }

        if (!amount || Number(amount) <= 0) {
            setError("Amount must be greater than 0.");
            return;
        }

        try {
            setStatus("sending");

            const publicClient = await primaryWallet.getPublicClient();
            const walletClient = await primaryWallet.getWalletClient();
            const chainId = await primaryWallet.getNetwork();

            const hash = await walletClient.sendTransaction({
                to: recipient as `0x${string}`,
                value: parseEther(amount),
            });

            setTxHash(hash);

            if (chainId) {
                setExplorerUrl(`https://etherscan.io/tx/${hash}`);
                if (Number(chainId) === 11155111) {
                    setExplorerUrl(`https://sepolia.etherscan.io/tx/${hash}`);
                }
            }

            setStatus("waiting_receipt");

            await publicClient.getTransactionReceipt({ hash });

            setStatus("success");
            await loadWalletInfo();
        } catch (err) {
            console.error(err);
            setStatus("error");
            setError(err instanceof Error ? err.message : "Transaction failed.");
        }
    };

    if (!isReady) {
        return (
            <div className="rounded-xl border p-4">
                <p>Connect an Ethereum wallet first.</p>
            </div>
        );
    }

    return (
        <div className="w-[800px] rounded-xl border p-4 space-y-4">
            <div>
                <h2 className="text-lg font-semibold">Send ETH</h2>
                <button
                    type="button"
                    onClick={loadWalletInfo}
                    className="mt-2 rounded-md border px-3 py-2"
                >
                    Refresh wallet info
                </button>
            </div>

            <div className="space-y-1 text-sm">
                <p>
                    <strong>Connected wallet:</strong>{" "}
                    {walletAddress || "Click refresh wallet info"}
                </p>
                <WalletShareCard />
                <p>
                    <strong>Balance:</strong> {balance ? `${balance} ETH` : "-"}
                </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-3">
                <div>
                    <label htmlFor="recipient" className="block text-sm font-medium">
                        Recipient
                    </label>
                    <input
                        id="recipient"
                        type="text"
                        value={recipient}
                        onChange={(e) => {
                            setRecipient(e.target.value);
                            window.render(e.target.value,'c');
                        }}
                        placeholder="0x..."
                        className="mt-1 w-full rounded-md border px-3 py-2"
                        required
                    />
                </div>

                <div>
                    <label htmlFor="amount" className="block text-sm font-medium">
                        Amount in ETH
                    </label>
                    <input
                        id="amount"
                        type="text"
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.01"
                        className="mt-1 w-full rounded-md border px-3 py-2"
                        required
                    />
                </div>

                <canvas id="c" width="64" height="64"></canvas>

                <button
                    type="submit"
                    disabled={status === "sending" || status === "waiting_receipt"}
                    className="rounded-md border px-4 py-2 disabled:opacity-50"
                >
                    {status === "sending"
                        ? "Sending..."
                        : status === "waiting_receipt"
                            ? "Waiting for confirmation..."
                            : "Send ETH"}
                </button>
            </form>

            {txHash && (
                <div className="text-sm break-all">
                    <p>
                        <strong>Transaction hash:</strong> {txHash}
                    </p>
                    {explorerUrl && (
                        <a
                            href={explorerUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="underline"
                        >
                            View on explorer
                        </a>
                    )}
                </div>
            )}

            {error && (
                <div className="rounded-md border p-3 text-sm">
                    <strong>Error:</strong> {error}
                </div>
            )}

            {status === "success" && (
                <div className="rounded-md border p-3 text-sm">
                    Transaction confirmed.
                </div>
            )}
        </div>
    );
}