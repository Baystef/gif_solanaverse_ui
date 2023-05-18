import './App.css';
import { useEffect, useState } from 'react';
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Connection, LAMPORTS_PER_SOL, PublicKey, Transaction, clusterApiUrl } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, web3 } from '@project-serum/anchor';
import { Buffer } from "buffer";
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import { toast } from 'react-hot-toast';

import UpvoteIcon from './assets/UpvoteIcon';
import SolIcon from './assets/SolIcon';
import Modal from './Modal';
import Ellipsis from './Ellipsis';
import kp from './keypair.json'

window.Buffer = Buffer;


// SystemProgram is a reference to the Solana runtime!
const { SystemProgram } = web3;

// Create a keypair for the account that will hold the GIF data.
const arr = Object.values(kp._keypair.secretKey)
const secret = new Uint8Array(arr)
const baseAccount = web3.Keypair.fromSecretKey(secret)

// This is the address of your solana program,  run solana address -k target/deploy/myepicproject-keypair.json
const programID = new PublicKey('BcTYTvCuAz27yUb4h6pDEhkhaTvoR1si4VPzEcFdDfS2');

// Set our network to devnet.
const network = clusterApiUrl('devnet');

// Controls how we want to acknowledge when a transaction is "done".
const opts = {
  preflightCommitment: "processed"
}

// Helpers
const shortenString = (str) => str ? `${str?.slice(0, 4)}...${str?.slice(-3)}` : '';
const stripQuotes = (str) => str.replace(/['"]+/g, '');

const App = () => {
  const [inputValue, setInputValue] = useState('');
  const [openModal, setOpenModal] = useState(false);
  const [tipping, setTipping] = useState(false);
  const [requestingAirdrop, setRequestingAirdrop] = useState(false);
  const [userBalInLamports, setUserBalInLamports] = useState(0);
  const [currentUserAddress, setCurrentUserAddress] = useState(null);
  const [gifList, setGifList] = useState([]);
  const { connected, publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const onInputChange = (event) => {
    const { value } = event.target;
    setInputValue(value);
  };

  const handleOpenModal = (userAddress) => {
    setOpenModal(true);
    setCurrentUserAddress(userAddress);
  }

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new AnchorProvider(connection, window.solana, opts.preflightCommitment);
    return provider;
  }


  const createGifAccount = async () => {
    try {
      const provider = getProvider();
      const program = await getProgram();

      console.log("ping")
      await program.methods.startStuffOff()
        .accounts({
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([baseAccount])
        .rpc();
      console.log("Created a new BaseAccount w/ address:", baseAccount.publicKey.toString())
      await getGifList();
    } catch (error) {
      console.log("Error creating BaseAccount account:", error)
      toast.error("Error creating BaseAccount account:", error)
    }
  }

  const sendGif = async () => {
    if (inputValue.length === 0) {
      console.log("No gif link given!")
      return
    }

    console.log('Gif link:', inputValue);
    setGifList([...gifList, stripQuotes(inputValue.trim())]);
    setInputValue('');
    try {
      const provider = getProvider()
      const program = await getProgram();

      await program.methods.addGif(stripQuotes(inputValue.trim()))
        .accounts({
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        })
        .rpc();
      console.log("GIF successfully sent to program", inputValue)
      await getGifList();
    } catch (error) {
      console.log("Error sending GIF:", error)
      toast.error("Error sending GIF:", error)
    }
  };

  const upvoteGif = async (gifId) => {
    try {
      const provider = getProvider();
      const program = await getProgram();

      await program.methods.upvoteGif(gifId)
        .accounts({
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        })
        .rpc()
        console.log("GIF successfully upvoted");
        toast.success("GIF successfully upvoted")
      await getGifList();
    } catch (error) {
      console.log("Error upvoting GIF:", error?.message);
      toast.error("Error upvoting GIF:", error?.message)
    }
  }

  const tipSol = async (destAddress, amount = 0.01) => {
    let signature;

    try {
      setTipping(true);
      if (!publicKey) throw new WalletNotConnectedError();
      if (publicKey.toBase58() === destAddress) throw new Error("You cannot tip yourself!");
      if (amount === 0) throw new Error("You cannot tip 0 SOL!");

      const amountInLamports = amount * LAMPORTS_PER_SOL;
      if (userBalInLamports < amountInLamports) throw new Error("You cannot tip more than your balance!");

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: destAddress,
          lamports: amountInLamports,
        })
      )

      const {
        context: { slot: minContextSlot },
        value: { blockhash, lastValidBlockHeight }
      } = await connection.getLatestBlockhashAndContext();

      signature = await sendTransaction(transaction, connection, { minContextSlot });

      await connection.confirmTransaction({
        blockhash: blockhash,
        lastValidBlockHeight: lastValidBlockHeight,
        signature
      }, "finalized");
      setTipping(false);
      console.log('Transaction confirmed:', signature);
      toast.success('Transaction confirmed:', `${shortenString(signature)}`)
    } catch (error) {
      setTipping(false);
      console.log('error', `Transaction failed! ${error?.message}`, signature);
      toast.error(`Transaction failed!: ${shortenString(signature)}, ${error?.message}`)
    }
  }

  const requestAirdrop = async () => {
    try {
      setRequestingAirdrop(true);
      if (!publicKey) throw new WalletNotConnectedError();
      const signature = await connection.requestAirdrop(publicKey, 2 * LAMPORTS_PER_SOL);
      const {
        value: { blockhash, lastValidBlockHeight }
      } = await connection.getLatestBlockhashAndContext();
      await connection.confirmTransaction({
        blockhash: blockhash,
        lastValidBlockHeight: lastValidBlockHeight,
        signature
      });
      setRequestingAirdrop(false);
      console.log('2 Sol Airdropped:', signature);
      toast.success(`2 Sol Airdropped: ${shortenString(signature)}`)
    } catch (error) {
      setRequestingAirdrop(false);
      console.log('error', `Airdrop failed! ${error?.message}`);
      toast.error(`Airdrop failed!: ${error?.message}`)
    }
  }

  /*
   * We want to render this UI when the user hasn't connected
   * their wallet to our app yet.
   */
  const renderNotConnectedContainer = () => (
    <div className='connect-btn-container'>
      <WalletMultiButton className='cta-button connect-wallet-button' />
    </div>
  );

  const renderConnectedContainer = () => {
    // If we hit this, it means the program account hasn't been initialized.
    if (gifList === null) {
      return (
        <div className="connected-container">
          <button className="cta-button connected" onClick={createGifAccount}>
            Do One-Time Initialization For GIF Program Account
          </button>
        </div>
      )
    }
    // Otherwise, we're good! Account exists. User can submit GIFs.
    else {
      return (
        <div className="connected-container">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              sendGif();
            }}
          >
            <input
              type="text"
              placeholder="Enter gif link!"
              value={inputValue}
              onChange={onInputChange}
            />
            <button type="submit" className="cta-button submit-gif-button connected">
              Submit
            </button>
          </form>
          <div className="gif-grid">
            {/* We use index as the key instead, also, the src is now item.gifLink */}
            {gifList?.map((item, index) => (
              <div className="gif-item" key={`${index}-id`}>
                <img src={item?.gifLink?.trim()} alt={item.gifLink} width="400" height="300" />
                <p className='user-address'>{shortenString(item?.userAddress?.toString())}</p>
                <span className='card-actions'>
                  <button title='click to upvote gif' onClick={() => upvoteGif(item.id)} className='upvote-btn'><UpvoteIcon /> {item.upvotes} votes</button>
                  <button title='click to tip gif poster' onClick={() => handleOpenModal(item.userAddress.toString())} className='upvote-btn'><SolIcon /> Tip</button>
                </span>
              </div>
            ))}
          </div>
        </div>
      )
    }
  }

  const getProgram = async () => {
    // Get metadata about your solana program
    const idl = await Program.fetchIdl(programID, getProvider());
    // Create a program that you can call
    return new Program(idl, programID, getProvider());
  }

  const getGifList = async () => {
    try {
      const program = await getProgram();
      const account = await program.account.baseAccount.fetch(baseAccount.publicKey);
      console.log("Got the account", account);
      setGifList(account.gifList);
    } catch (error) {
      console.log("Error in getGifList: ", error)
      toast.error("Error getting gifs: ", error)
      setGifList(null);
    }
  }

  useEffect(() => {
    if (connected) {
      console.log('Fetching GIF list...');
      // Call Solana program here.
      getGifList()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  useEffect(() => {
    const getUserBalance = async () => {
      try {
        if (connected && publicKey) {
          const provider = getProvider();
          const userBalance = await provider.connection.getBalance(publicKey);
          setUserBalInLamports(userBalance);
        }
      } catch (error) {
        console.log(error);
      }
    }

    getUserBalance();

  }, [publicKey, connected])


  return (
    <div className="App">
      <Modal
        key={currentUserAddress}
        tipSol={tipSol}
        tipping={tipping}
        isOpen={openModal}
        setIsOpen={setOpenModal}
        userAddress={currentUserAddress}
      />

      <div className={connected ? 'authed-container' : 'container'}>
        <div className="header-container">
          <div className="title-container">
            <div className="filler"></div>
            <p className="header">🖼 Gif Portal</p>
            <div className="cta-button-container">
              {connected ? <WalletMultiButton className='cta-button connect-wallet-button' /> : null}
            </div>
          </div>
          <p className="sub-text">
            View your Gif collection in the solana-verse ✨
          </p>
          {!connected ? renderNotConnectedContainer() : renderConnectedContainer()}
        </div>
        <div className='airdrop-button-container'>
          {connected && <button onClick={requestAirdrop} disabled={requestingAirdrop} className="cta-button connect-wallet-button">
            {requestingAirdrop ? <Ellipsis /> : <>Request 2 Sol Airdrop</>}
          </button>}
        </div>
      </div>
    </div>
  );
};

export default App;
