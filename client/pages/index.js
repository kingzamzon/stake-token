import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import Web3Modal from 'web3modal';
import { providers, Contract, ethers } from 'ethers';
import { useEffect, useRef, useState } from 'react';
import { STAKING_CONTRACT_ADDRESS, abi } from '../constants';


export default function Home() {
  // walletConnected keep track of whether the user's wallet is connected or not
  const [walletConnected, setWalletConnected] = useState(false);
  // stakeHolder keeps track of whether the current metamask address has created stake
  const [stakeHolder, setstakeHolder] = useState(false);
  // loading is set to true when we are waiting for a transaction to get mined
  const [loading, setLoading] = useState(false);
  // total token owe by signer
  const [userTokenTotal, setUserTokenTotal] = useState(0);
  // total token staked by signer
  const [numberOfUserStakedToken, setNumberOfUserStakedToken] = useState(0);
  // totalStakes tracks the number of addresses's whitelisted
  const [numberOfStaked, setNumberOfStaked] = useState(0);
  // Create a reference to the Web3 Modal (used for connecting to Metamask) which persists as long as the page is open
  const web3ModalRef = useRef();
  // store amount of token user want to buy in local state
  const [tokenAmount, setTokenAmountValue] = useState(0);
   // store stake amount in local state
   const [stakeAmount, setStakeAmountValue] = useState(0);

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

    /**
   * addAddressToWhitelist: Adds the current connected address to the whitelist
   */
  const addAddressToWhitelist = async () => {
    try {
      // We need a Signer here since this is a 'write' transaction.
      const signer = await getProviderOrSigner(true);
      // Create a new instance of the Contract with a Signer, which allows
      // update methods
      const whitelistContract = new Contract(
        STAKING_CONTRACT_ADDRESS,
        abi,
        signer
      );
      // call the addAddressToWhitelist from the contract
      const tx = await whitelistContract.addAddressToWhitelist();
      setLoading(true);
      // wait for the transaction to get mined
      await tx.wait();
      setLoading(false);
      // get the updated number of addresses in the whitelist
      await getNumberOfWhitelisted();
      setstakeHolder(true);
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * getNumberOfWhitelisted:  gets the number of whitelisted addresses
   */
   const getNumberOfWhitelisted = async () => {
    try {
      // Get the provider from web3Modal, which in our case is MetaMask
      // No need for the Signer here, as we are only reading state from the blockchain
      const provider = await getProviderOrSigner();
      // We connect to the Contract using a Provider, so we will only
      // have read-only access to the Contract
      const whitelistContract = new Contract(
        STAKING_CONTRACT_ADDRESS,
        abi,
        provider
      );
      // call the numAddressesWhitelisted from the contract
      // const _numberOfStakers = await whitelistContract.tokenPerEth();
      let _numberOfStakers = await whitelistContract.totalStakeHolders();
      _numberOfStakers = ethers.utils.formatUnits(_numberOfStakers, 0);
      // _numberOfStakers = ethers.utils.formatEther(_numberOfStakers);
      console.log(_numberOfStakers)
      setNumberOfStaked(_numberOfStakers);
    } catch (err) {
      console.error(err);
    }
  };

    /**
   * getNumberOfWhitelisted:  gets the number of whitelisted addresses
   */
     const getSignerTotalToken = async () => {
      try {
        // Get the provider from web3Modal, which in our case is MetaMask
        // No need for the Signer here, as we are only reading state from the blockchain
        // const provider = await getProviderOrSigner();
        const signer = await getProviderOrSigner(true);
        // We connect to the Contract using a Provider, so we will only
        // have read-only access to the Contract
        const whitelistContract = new Contract(
          STAKING_CONTRACT_ADDRESS,
          abi,
          signer
        );

        // Get the address associated to the signer which is connected to  MetaMask
      const address = await signer.getAddress();
      // call the numAddressesWhitelisted from the contract
        // const _numberOfStakers = await whitelistContract.tokenPerEth();
        let _numberOfUserToken = await whitelistContract.balanceOf(address);
        _numberOfUserToken = ethers.utils.formatUnits(_numberOfUserToken, 0);
        // _numberOfUserToken = _numberOfUserToken.toNumber();
        // _numberOfUserToken = ethers.utils.formatEther(_numberOfUserToken);
        console.log("hey hey",_numberOfUserToken)
        setUserTokenTotal(_numberOfUserToken);
      } catch (err) {
        console.error(err);
      }
    };

        /**
   * getNumberOfWhitelisted:  gets the number of whitelisted addresses
   */
      const getSignerTotalStaked = async () => {
      try {
        // Get the provider from web3Modal, which in our case is MetaMask
        // No need for the Signer here, as we are only reading state from the blockchain
        // const provider = await getProviderOrSigner();
        const signer = await getProviderOrSigner(true);
        // We connect to the Contract using a Provider, so we will only
        // have read-only access to the Contract
        const whitelistContract = new Contract(
          STAKING_CONTRACT_ADDRESS,
          abi,
          signer
        );

        // Get the address associated to the signer which is connected to  MetaMask
      const address = await signer.getAddress();
      // call the numAddressesWhitelisted from the contract
        // const _numberOfStakers = await whitelistContract.tokenPerEth();
        let _numberOfUserToken = await whitelistContract.stakeOf(address);
        _numberOfUserToken = ethers.utils.formatUnits(_numberOfUserToken, 0);
        // _numberOfUserToken = ethers.utils.formatEther(_numberOfUserToken);
        console.log(_numberOfUserToken)
        setNumberOfUserStakedToken(_numberOfUserToken);
      } catch (err) {
        console.error(err);
      }
    };

  /**
   * checkIfAddressInWhitelist: Checks if the address is in whitelist
   */
   const checkIfAddressInWhitelist = async () => {
    try {
      // We will need the signer later to get the user's address
      // Even though it is a read transaction, since Signers are just special kinds of Providers,
      // We can use it in it's place
      const signer = await getProviderOrSigner(true);
      const whitelistContract = new Contract(
        STAKING_CONTRACT_ADDRESS,
        abi,
        signer
      );
      // Get the address associated to the signer which is connected to  MetaMask
      const address = await signer.getAddress();
      // call the whitelistedAddresses from the contract
      const _joinedWhitelist = await whitelistContract.isStakeholder(
        address
      );
      setstakeHolder(_joinedWhitelist);
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * Buy token
   */
  const buyToken = async () => {
    try {

    } catch (err) {
      console.log(err);
    }
  }

  /**
   * stake token
   */
   const stakeToken = async () => {
    try {

    } catch (err) {
      console.log(err);
    }
  }

  /*
    connectWallet: Connects the MetaMask wallet
  */
    const connectWallet = async () => {
      try {
        // Get the provider from web3Modal, which in our case is MetaMask
        // When used for the first time, it prompts the user to connect their wallet
        await getProviderOrSigner();
        setWalletConnected(true);
  
        checkIfAddressInWhitelist();
        getNumberOfWhitelisted();
        getSignerTotalToken();
        getSignerTotalStaked();
      } catch (err) {
        console.error(err);
      }
    };

    /*
    renderButton: Returns a button based on the state of the dapp
  */
  const renderButton = () => {
    if (walletConnected) {
      if (stakeHolder) {
        return (
          <div className={styles.description}>
            Thanks for joining staking earlier
          </div>
        );
      } else if (loading) {
        return <button className={styles.button}>Loading...</button>;
      } else {
        return (
          <button onClick={addAddressToWhitelist} className={styles.button}>
            Join the Whitelist
          </button>
        );
      }
    } else {
      return (
        <button onClick={connectWallet} className={styles.button}>
          Connect your wallet
        </button>
      );
    }
  };

  /**
   * Render stake or buy token div
   */
  const rederStakeBuyTokenDiv = () => {
    if (walletConnected) {
      return(
      <div className={styles.flex_container}>
        <div>
            <h4> Buy Token </h4>
            <input
              type="number"
              onChange={(e) => setTokenAmountValue(e.target.value)} placeholder="Amount"
            /> <br />
            <button className="waveButton" onClick={buyToken}>
              Buy Token
            </button>
        </div>
        <div>
          <h4> Stake Token </h4>
          <input
              type="number"
              onChange={(e) => setStakeAmountValue(e.target.value)} placeholder="Amount"
            /> <br />
            <button className="waveButton" onClick={stakeToken}>
              Stake Token
            </button>
        </div>
      </div>
      );
    }
  }

  // useEffects are used to react to changes in state of the website
  // The array at the end of function call represents what state changes will trigger this effect
  // In this case, whenever the value of `walletConnected` changes - this effect will be called
  useEffect(() => {
    // if wallet is not connected, create a new instance of Web3Modal and connect the MetaMask wallet
    if (!walletConnected) {
      // Assign the Web3Modal class to the reference object by setting it's `current` value
      // The `current` value is persisted throughout as long as this page is open
      web3ModalRef.current = new Web3Modal({
        network: "rinkeby",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet();
    }
  }, [walletConnected]);

  return (
    <div className={styles.container}>
      <Head>
        <title>Whitelist Dapp</title>
        <meta name="description" content="Whitelist-Dapp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to SRC Token</h1>
          <div className={styles.description}>
            Total Stakers: {numberOfStaked} Stakers. <br />
            Token Staked: {numberOfUserStakedToken} SRC. <br />
            Token Balance: {userTokenTotal} SRC.
          </div>
          {renderButton()}
          {rederStakeBuyTokenDiv()}
        </div>
      </div>
    </div>
  )
}
