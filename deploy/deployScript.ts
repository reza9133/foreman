import { readFileSync } from "fs";
import path from "path";
import {
  TransactionHash,
  TransactionStatus,
  GenLayerClient,
  DecodedDeployData,
} from "genlayer-js/types";

export const isSuccessfulDeploymentReceipt = (receipt: {
  status?: number | string;
  statusName?: string;
}): boolean => {
  const numericStatus = Number(receipt.status);
  return (
    numericStatus === 5 ||
    numericStatus === 7 ||
    receipt.statusName === "ACCEPTED" ||
    receipt.statusName === "FINALIZED"
  );
};

export default async function main(client: GenLayerClient<any>) {
  const filePath = path.resolve(process.cwd(), "contracts/foreman.py");

  try {
    const contractCode = new Uint8Array(readFileSync(filePath));

    const deployTransaction = await client.deployContract({
      code: contractCode,
      args: [],
    });

    const receipt = await client.waitForTransactionReceipt({
      hash: deployTransaction as TransactionHash,
      status: TransactionStatus.ACCEPTED,
      interval: 3000,
      retries: 200,
    });

    if (!isSuccessfulDeploymentReceipt(receipt)) {
      throw new Error(`Deployment failed. Receipt: ${JSON.stringify(receipt)}`);
    }

    // Studio backends (localnet, Studionet) report the new address on
    // `receipt.data.contract_address`; other networks report it on the decoded
    // deploy calldata. Read whichever is present instead of branching on chain
    // id.
    const deployedContractAddress =
      receipt.data?.contract_address ??
      (receipt.txDataDecoded as DecodedDeployData)?.contractAddress;

    if (!deployedContractAddress) {
      throw new Error("Deployment receipt did not contain a contract address");
    }

    console.log(`Contract deployed at address: ${deployedContractAddress}`);
  } catch (error) {
    throw new Error(`Error during deployment:, ${error}`);
  }
}
