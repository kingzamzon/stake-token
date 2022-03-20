import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import Web3Modal from 'web3modal';
import { providers, Contract } from 'ethers';
import { useEffect, useRef, useState } from 'react';
import { STAKING_CONTRACT_ADDRESS, abi } from '../constants';


export default function Home() {
  // walletConnected keep track of whether the user's wallet is connected or not
  const [walletConnected, setWalletConnected] = useState(false);
  // stakeHolder keeps track of whether the current metamask address has created stake
  const [stakeHolder, setstakeHolder] = useState(false);
  // loading is set to true when we are waiting for a transaction to get mined
  const [loading, setLoading] = useState(false);
  // totalStakes tracks the number of addresses's whitelisted
  const [totalStakes, settotalStakes] = useState(0);
  // Create a reference to the Web3 Modal (used for connecting to Metamask) which persists as long as the page is open
  const web3ModalRef = useRef();

   /**
   * Returns a Provider or Signer object representing the Ethereum RPC with or without the
   * signing capabilities of metamask attached
   *
   * A `Provider` is needed to interact with the blockchain - reading transactions, reading balances, reading state, etc.
   *
   * A `Signer` is a special type of Provider used in case a `write` transaction needs to be made to the blockchain, which involves the connected account
   * needing to make a digital signature to authorize the transaction being sent. Metamask exposes a Signer API to allow your website to
   * request signatures from the user using Signer functions.
   *
   * @param {*} needSigner - True if you need the signer, default false otherwise
   */
    const getProviderOrSigner = async (needSigner = false) => {
      // Connect to Metamask
      // Since we store `web3Modal` as a reference, we need to access the `current` value to get access to the underlying object
      const provider = await web3ModalRef.current.connect();
      const web3Provider = new providers.Web3Provider(provider);
  
      // If user is not connected to the Rinkeby network, let them know and throw an error
      const { chainId } = await web3Provider.getNetwork();
      if (chainId !== 4) {
        window.alert("Change the network to Rinkeby");
        throw new Error("Change network to Rinkeby");
      }
  
      if (needSigner) {
        const signer = web3Provider.getSigner();
        return signer;
      }
      return web3Provider;
    };

  return (
    <div className={styles.container}>
      
    </div>
  )
}
