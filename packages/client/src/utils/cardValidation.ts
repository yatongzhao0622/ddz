// Dou Dizhu Card Hand Validation Utilities

import { Card, CardRank } from '../types/game';

export interface ValidationResult {
  isValid: boolean;
  handType: string;
  message: string;
}

// Get card value for comparison (higher value = stronger card)
const getCardValue = (card: Card): number => {
  const rankValues: { [key in CardRank]: number } = {
    [CardRank.THREE]: 3,
    [CardRank.FOUR]: 4,
    [CardRank.FIVE]: 5,
    [CardRank.SIX]: 6,
    [CardRank.SEVEN]: 7,
    [CardRank.EIGHT]: 8,
    [CardRank.NINE]: 9,
    [CardRank.TEN]: 10,
    [CardRank.JACK]: 11,
    [CardRank.QUEEN]: 12,
    [CardRank.KING]: 13,
    [CardRank.ACE]: 14,
    [CardRank.TWO]: 15,
    [CardRank.BLACK_JOKER]: 16,
    [CardRank.RED_JOKER]: 17
  };
  return rankValues[card.rank];
};

// Group cards by rank
const groupByRank = (cards: Card[]): { [rank: string]: Card[] } => {
  return cards.reduce((groups, card) => {
    const rank = card.rank;
    if (!groups[rank]) {
      groups[rank] = [];
    }
    groups[rank].push(card);
    return groups;
  }, {} as { [rank: string]: Card[] });
};

// Check if cards form a valid single card
const isValidSingle = (cards: Card[]): ValidationResult => {
  if (cards.length === 1) {
    return {
      isValid: true,
      handType: 'single',
      message: '单牌'
    };
  }
  return {
    isValid: false,
    handType: 'invalid',
    message: '单牌只能出一张牌'
  };
};

// Check if cards form a valid pair
const isValidPair = (cards: Card[]): ValidationResult => {
  if (cards.length === 2) {
    const groups = groupByRank(cards);
    const ranks = Object.keys(groups);
    
    if (ranks.length === 1 && groups[ranks[0]].length === 2) {
      return {
        isValid: true,
        handType: 'pair',
        message: '对子'
      };
    }
  }
  return {
    isValid: false,
    handType: 'invalid',
    message: '对子需要两张相同点数的牌'
  };
};

// Check if cards form a valid triple
const isValidTriple = (cards: Card[]): ValidationResult => {
  if (cards.length === 3) {
    const groups = groupByRank(cards);
    const ranks = Object.keys(groups);
    
    if (ranks.length === 1 && groups[ranks[0]].length === 3) {
      return {
        isValid: true,
        handType: 'triple',
        message: '三张'
      };
    }
  }
  return {
    isValid: false,
    handType: 'invalid',
    message: '三张需要三张相同点数的牌'
  };
};

// Check if cards form a valid bomb (4 of a kind)
const isValidBomb = (cards: Card[]): ValidationResult => {
  if (cards.length === 4) {
    const groups = groupByRank(cards);
    const ranks = Object.keys(groups);
    
    if (ranks.length === 1 && groups[ranks[0]].length === 4) {
      return {
        isValid: true,
        handType: 'bomb',
        message: '炸弹'
      };
    }
  }
  return {
    isValid: false,
    handType: 'invalid',
    message: '炸弹需要四张相同点数的牌'
  };
};

// Check if cards form a rocket (both jokers)
const isValidRocket = (cards: Card[]): ValidationResult => {
  if (cards.length === 2) {
    const hasBlackJoker = cards.some(card => card.rank === CardRank.BLACK_JOKER);
    const hasRedJoker = cards.some(card => card.rank === CardRank.RED_JOKER);
    
    if (hasBlackJoker && hasRedJoker) {
      return {
        isValid: true,
        handType: 'rocket',
        message: '王炸'
      };
    }
  }
  return {
    isValid: false,
    handType: 'invalid',
    message: '王炸需要大小王'
  };
};

// Check if cards form a valid straight (consecutive singles)
const isValidStraight = (cards: Card[]): ValidationResult => {
  if (cards.length < 5) {
    return {
      isValid: false,
      handType: 'invalid',
      message: '顺子至少需要5张牌'
    };
  }

  // Remove jokers (can't be in straights)
  const nonJokers = cards.filter(card => 
    card.rank !== CardRank.BLACK_JOKER && card.rank !== CardRank.RED_JOKER
  );
  
  if (nonJokers.length !== cards.length) {
    return {
      isValid: false,
      handType: 'invalid',
      message: '顺子不能包含王牌'
    };
  }

  const groups = groupByRank(nonJokers);
  const ranks = Object.keys(groups).sort((a, b) => {
    const cardA = groups[a][0];
    const cardB = groups[b][0];
    return getCardValue(cardA) - getCardValue(cardB);
  });

  // Check if each rank has exactly one card
  for (const rank of ranks) {
    if (groups[rank].length !== 1) {
      return {
        isValid: false,
        handType: 'invalid',
        message: '顺子每个点数只能有一张牌'
      };
    }
  }

  // Check if ranks are consecutive
  for (let i = 1; i < ranks.length; i++) {
    const prevValue = getCardValue(groups[ranks[i-1]][0]);
    const currValue = getCardValue(groups[ranks[i]][0]);
    
    if (currValue - prevValue !== 1) {
      return {
        isValid: false,
        handType: 'invalid',
        message: '顺子必须是连续的点数'
      };
    }
  }

  return {
    isValid: true,
    handType: 'straight',
    message: `${cards.length}张顺子`
  };
};

// Main validation function
export const validateCardHand = (selectedCardIds: string[], allCards: Card[]): ValidationResult => {
  console.log(`🎮 Validating hand with ${selectedCardIds.length} cards:`, selectedCardIds);
  
  if (selectedCardIds.length === 0) {
    return {
      isValid: false,
      handType: 'empty',
      message: '请选择要出的牌'
    };
  }

  // Get selected cards
  const selectedCards = allCards.filter(card => selectedCardIds.includes(card.id));
  
  if (selectedCards.length !== selectedCardIds.length) {
    return {
      isValid: false,
      handType: 'invalid',
      message: '所选牌张不存在'
    };
  }

  console.log(`🎮 Selected cards:`, selectedCards.map(c => `${c.rank}${c.suit || ''}`));

  // Try different hand types
  const validations = [
    isValidRocket(selectedCards),
    isValidBomb(selectedCards),
    isValidTriple(selectedCards),
    isValidPair(selectedCards),
    isValidSingle(selectedCards),
    isValidStraight(selectedCards)
  ];

  // Return the first valid result
  for (const result of validations) {
    if (result.isValid) {
      console.log(`🎮 Valid hand found:`, result);
      return result;
    }
  }

  // If no valid hand found
  const result = {
    isValid: false,
    handType: 'invalid',
    message: '无效的牌型组合'
  };
  
  console.log(`🎮 Invalid hand:`, result);
  return result;
}; 