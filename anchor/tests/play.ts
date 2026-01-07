import * as anchor from "@coral-xyz/anchor"
import { Keypair, PublicKey } from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";


describe("Test play", () => {

    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const alice = Keypair.generate();
    console.log("Alice地址:", alice.publicKey.toBase58());

    const bob = Keypair.generate()

    // const knownaddress = new PublicKey("...")

    const mintAddress = await createMint(provider.connection, alice, alice.publicKey, null, 6)

    const bobATA = await getOrCreateAssociatedTokenAccount(provider.connection, alice, mintAddress, bob.publicKey)

awiat mintTo(
        provider.connection,
        anlice,
        mintAddress,
        bobATA.address,
        alice,
        100 * 10 ** 6
    )
})