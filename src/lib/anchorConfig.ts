export interface PreRecordedAnchorConfig {
  network: string;
  contractAddress: string;
  txHash: string;
  label: string;
}

/**
 * Pre-recorded public testnet anchor configuration.
 * Replace contractAddress and txHash with your real deployed contract & transaction hash.
 */
export const PRE_RECORDED_ANCHOR: PreRecordedAnchorConfig = {
  network: 'Sepolia',
  contractAddress: '0xD88e6941867273544C15080e49a5aCD04Adf43A5',
  txHash: '0x3f571a53772dab83689a0d2aa5c93eb67ac1e25c1f6b4e6482a6b898161ac89d',
  label: 'seed-batch-1, entries 1-8',
};
