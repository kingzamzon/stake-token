// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract StakeToken is ERC20, Ownable, ReentrancyGuard {
     using SafeMath for uint256;

     /// @notice Base of the staked token, it is going to be used in the case of sanTokens
    /// which are not in base 10**18
    uint256 public immutable stakingBase = 10**18;
    // ============================ Staking parameters =============================

    /// @notice Time at which distribution ends
    uint256 public periodFinish = 0;

    /// @notice Reward per second given to the staking contract, split among the staked tokens
    uint256 public rewardRate = 0;

    /// @notice Duration of the reward distribution
    uint256 public rewardsDuration = 1 minutes;

    /// @notice Last time `rewardPerTokenStored` was updated
    uint256 public lastUpdateTime;

    /// @notice Helps to compute the amount earned by someone
    /// Cumulates rewards accumulated for one token since the beginning.
    /// Stored as a uint so it is actually a float times the base of the reward token
    uint256 public rewardPerTokenStored;

    /// @notice Stores for each account the `rewardPerToken`: we do the difference
    /// between the current and the old value to compute what has been earned by an account
    mapping(address => uint256) public userRewardPerTokenPaid;

    /**
     * @notice We usually require to know who are all the stakeholders.
     */
    address[] internal stakeholders;

    /**
     * @notice The stakes for each stakeholder.
     */
    mapping(address => uint256) internal stakes;

    /**
     * @notice The accumulated rewards for each stakeholder.
     */
    mapping(address => uint256) internal rewards;

     // token price for ETH
    uint256 public tokensPerEth = 1000;

    /**
     * @notice The constructor for the Staking Token.
     */
    constructor()  ERC20("SamERC", "SRC")
    { 
        _mint(msg.sender, 1000 * 10 ** decimals());
    }

     
   // ============================ Modifiers ======================================

    /// @notice Checks to see if the calling address is the zero address
    /// @param account Address to check
    modifier zeroCheck(address account) {
        require(account != address(0), "0");
        _;
    }

    /// @notice Called frequently to update the staking parameters associated to an address
    /// @param account Address of the account to update
    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    // ============================ View functions =================================
    /// @notice Queries the last timestamp at which a reward was distributed
    /// @dev Returns the current timestamp if a reward is being distributed and the end of the staking
    /// period if staking is done
    function lastTimeRewardApplicable() public view returns (uint256) {
        return block.timestamp < periodFinish ? block.timestamp : periodFinish;
    }

    /// @notice Used to actualize the `rewardPerTokenStored`
    /// @dev It adds to the reward per token: the time elapsed since the `rewardPerTokenStored` was
    /// last updated multiplied by the `rewardRate` divided by the number of tokens
    function rewardPerToken() public view returns (uint256) {
        if (totalSupply() == 0) {
            return rewardPerTokenStored;
        }
        return
            rewardPerTokenStored +
            (((lastTimeRewardApplicable() - lastUpdateTime) * rewardRate * stakingBase) / totalSupply());
    }

    /// @notice Returns how much a given account earned rewards
    /// @param account Address for which the request is made
    /// @return How much a given account earned rewards
    /// @dev It adds to the rewards the amount of reward earned since last time that is the difference
    /// in reward per token from now and last time multiplied by the number of tokens staked by the person
    function earned(address account) public view returns (uint256) {
        return
            (balanceOf(account) * (rewardPerToken() - userRewardPerTokenPaid[account])) /
            stakingBase +
            rewards[account];
    }


    // ---------- Token ----------

    function buyToken(address receiver) public payable returns (uint256){
        uint256 tokenAmount = msg.value / (1 * 10 ** decimals()) * tokensPerEth;
        
        _mint(receiver, tokenAmount);
        
        return tokenAmount;
    }

    /**
     * @notice A method to modify token buy price
     * @param _tokenPrice The price of token per eth.
     */
    function modifyTokenBuyPrice(uint256 _tokenPrice) public onlyOwner returns (uint256)
    {
        tokensPerEth = _tokenPrice;
        
        emit TokenPriceUpdated(tokensPerEth);

        return tokensPerEth;
    }

    // ---------- STAKES ----------

    /**
     * @notice A method for a stakeholder to create a stake.
     * @param _stake The size of the stake to be created.
     */
    function createStake(uint256 _stake)
        public
        nonReentrant
        updateReward(msg.sender)
    {
        _burn(msg.sender, _stake);
        if(stakes[msg.sender] == 0) addStakeholder(msg.sender);
        stakes[msg.sender] = stakes[msg.sender].add(_stake);
        emit Staked(msg.sender, _stake);
    }

    /**
     * @notice A method for a stakeholder to remove a stake.
     * @param _stake The size of the stake to be removed.
     */
    function removeStake(uint256 _stake)
        public
        nonReentrant 
        updateReward(msg.sender)
    {
        stakes[msg.sender] = stakes[msg.sender].sub(_stake);
        if(stakes[msg.sender] == 0) removeStakeholder(msg.sender);
        _mint(msg.sender, _stake);
        emit Withdrawn(msg.sender, _stake);
    }

    /**
     * @notice A method to retrieve the stake for a stakeholder.
     * @param _stakeholder The stakeholder to retrieve the stake for.
     * @return uint256 The amount of wei staked.
     */
    function stakeOf(address _stakeholder)
        public
        view
        returns(uint256)
    {
        return stakes[_stakeholder];
    }

    /**
     * @notice A method to the aggregated stakes from all stakeholders.
     * @return uint256 The aggregated stakes from all stakeholders.
     */
    function totalStakes()
        public
        view
        returns(uint256)
    {
        uint256 _totalStakes = 0;
        for (uint256 s = 0; s < stakeholders.length; s += 1){
            _totalStakes = _totalStakes.add(stakes[stakeholders[s]]);
        }
        return _totalStakes;
    }

    /**
     * @notice A method to the aggregated stakes from all stakeholders.
     * @return uint256 The aggregated stakes from all stakeholders.
     */
    function totalStakeHolders()
        public
        view
        returns(uint256)
    {
        return stakeholders.length;
    }

    // ---------- STAKEHOLDERS ----------

    /**
     * @notice A method to check if an address is a stakeholder.
     * @param _address The address to verify.
     * @return bool, uint256 Whether the address is a stakeholder, 
     * and if so its position in the stakeholders array.
     */
    function isStakeholder(address _address)
        public
        view
        returns(bool, uint256)
    {
        for (uint256 s = 0; s < stakeholders.length; s += 1){
            if (_address == stakeholders[s]) return (true, s);
        }
        return (false, 0);
    }

    /**
     * @notice A method to add a stakeholder.
     * @param _stakeholder The stakeholder to add.
     */
    function addStakeholder(address _stakeholder)
        public
    {
        (bool _isStakeholder, ) = isStakeholder(_stakeholder);
        if(!_isStakeholder) stakeholders.push(_stakeholder);
    }

    /**
     * @notice A method to remove a stakeholder.
     * @param _stakeholder The stakeholder to remove.
     */
    function removeStakeholder(address _stakeholder)
        public
    {
        (bool _isStakeholder, uint256 s) = isStakeholder(_stakeholder);
        if(_isStakeholder){
            stakeholders[s] = stakeholders[stakeholders.length - 1];
            stakeholders.pop();
        } 
    }


    // ---------- REWARDS ----------
    
    /**
     * @notice A method to allow a stakeholder to check his rewards.
     * @param _stakeholder The stakeholder to check rewards for.
     */
    function rewardOf(address _stakeholder) 
        public
        view
        returns(uint256)
    {
        return rewards[_stakeholder];
    }

    /**
     * @notice A method to the aggregated rewards from all stakeholders.
     * @return uint256 The aggregated rewards from all stakeholders.
     */
    function totalRewards()
        public
        view
        returns(uint256)
    {
        uint256 _totalRewards = 0;
        for (uint256 s = 0; s < stakeholders.length; s += 1){
            _totalRewards = _totalRewards.add(rewards[stakeholders[s]]);
        }
        return _totalRewards;
    }

    /** 
     * @notice A simple method that calculates the rewards for each stakeholder.
     * @param _stakeholder The stakeholder to calculate rewards for.
     */
    function calculateReward(address _stakeholder)
        public
        view
        returns(uint256)
    {
        return stakes[_stakeholder] / 100;
    }

    /**
     * @notice A method to distribute rewards to all stakeholders.
     */
    function distributeRewards() 
        public
        onlyOwner
    {
        for (uint256 s = 0; s < stakeholders.length; s += 1){
            address stakeholder = stakeholders[s];
            uint256 reward = calculateReward(stakeholder);
            rewards[stakeholder] = rewards[stakeholder].add(reward);
        }
    }

    /**
     * @notice A method to allow a stakeholder to withdraw his rewards.
     */
    function withdrawReward() 
        public
    {
        uint256 reward = rewards[msg.sender];
        rewards[msg.sender] = 0;
        _mint(msg.sender, reward);
    }

    /// @notice Triggers a payment of the reward earned to the msg.sender
    function getReward() public nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            _mint(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    /// @notice Exits someone
    /// @dev This function lets the caller withdraw its staking and claim rewards
    // Attention here, there may be reentrancy attacks because of the following call
    // to an external contract done before other things are modified, yet since the `rewardToken`
    // is mostly going to be a trusted contract controlled by governance (namely the ANGLE token),
    // this is not an issue. If the `rewardToken` changes to an untrusted contract, this need to be updated.
    function exit() public {
        removeStake(balanceOf(msg.sender));
        getReward();
    }

    /* ========== EVENTS ========== */

    event RewardAdded(uint256 reward);
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);
    event RewardsDurationUpdated(uint256 newDuration);
    event TokenPriceUpdated(uint256 newPrice);
}