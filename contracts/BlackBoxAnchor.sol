// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BlackBoxAnchor
 * @dev Cryptographic flight recorder anchor contract for AgentBlackBox (NEURALDAO 2.0).
 * Anchors 32-byte SHA-256 head hashes of off-chain decision ledgers onto Ethereum testnets.
 */
contract BlackBoxAnchor {
    struct Anchor {
        address anchorer;
        uint64 timestamp;
        string label;
    }

    // Mapping from 32-byte head hash to Anchor record
    mapping(bytes32 => Anchor) public anchors;

    // Emitted when a new ledger head hash is committed
    event Anchored(
        bytes32 indexed headHash,
        address indexed anchorer,
        uint64 timestamp,
        string label
    );

    /**
     * @notice Anchor the head hash of an AgentBlackBox decision ledger
     * @param headHash 32-byte SHA-256 head hash of the ledger
     * @param label Descriptive label (e.g. "batch-1, entries 1-12")
     */
    function anchor(bytes32 headHash, string calldata label) external {
        require(anchors[headHash].timestamp == 0, "already anchored");
        anchors[headHash] = Anchor(msg.sender, uint64(block.timestamp), label);
        emit Anchored(headHash, msg.sender, uint64(block.timestamp), label);
    }

    /**
     * @notice Verify if a head hash was previously anchored
     * @param headHash 32-byte SHA-256 head hash to query
     * @return isAnchored True if hash exists on-chain
     * @return timestamp Block timestamp when anchored
     * @return anchorer Wallet address that committed the anchor
     */
    function verify(bytes32 headHash) external view returns (bool isAnchored, uint64 timestamp, address anchorer) {
        Anchor memory a = anchors[headHash];
        return (a.timestamp != 0, a.timestamp, a.anchorer);
    }
}
