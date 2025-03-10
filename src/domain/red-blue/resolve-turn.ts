import { PokemonEncounterType, PokemonInstance } from "../../state/state-types";
import {
  applyMoveEffects,
  calculateGen1Damage,
  checkCanAct,
  getGen1BaseSpeed,
  getGen1HitCount,
  getGen1CriticalChance,
  getForcedChargingMove,
  getMoveAccuracy,
  prepareTwoTurnMove,
} from "./battle-rules";
import { getGen1MoveMetadata, getGen1PokemonTypes } from "./catalog";
import getTypeEffectiveness from "../../app/type-effectiveness";
import { getMoveMetadata } from "../../app/use-move-metadata";
import { getPokemonMetadata } from "../../app/use-pokemon-metadata";

export interface TurnResolution {
  moveName: string;
  us: PokemonInstance;
  them: PokemonEncounterType;
  missed: boolean;
  failed: boolean;
  blocked: boolean;
  superEffective: boolean;
  notVeryEffective: boolean;
  critical: boolean;
  isBuff: boolean;
  isDebuff: boolean;
  effectMessages: string[];
}

const spendPp = (pokemon: PokemonInstance, move: string) => ({
  ...pokemon,
  moves: pokemon.moves.map((candidate) =>
    candidate.id === move
      ? { ...candidate, pp: Math.max(0, candidate.pp - 1) }
      : candidate
  ),
});

const resolveBattleTurn = (
  us: PokemonInstance,
  them: PokemonEncounterType,
  moveId: string,
  isAttacking: boolean
): TurnResolution => {
  const move = getGen1MoveMetadata(getMoveMetadata(moveId));
  let nextUs = us;
  let nextThem = them;

  const defaultResult = (): TurnResolution => ({
    moveName: move.name,
    us: nextUs,
    them: nextThem,
    missed: false,
    failed: false,
    blocked: false,
    superEffective: false,
    notVeryEffective: false,
    critical: false,
    isBuff: false,
    isDebuff: false,
    effectMessages: [],
  });

  // Generation I checks sleep/freeze/paralysis before the selected move resolves.
  if (isAttacking) {
    const continuingCharge = getForcedChargingMove(nextUs) === moveId;
    const action = checkCanAct(nextUs, moveId);
    nextUs = action.pokemon;
    if (!action.canAct) {
      return {
        ...defaultResult(),
        blocked: true,
        effectMessages: action.message ? [action.message] : [],
      };
    }
    if (moveId !== "struggle" && !continuingCharge) {
      nextUs = spendPp(nextUs, moveId);
    }
  } else {
    const action = checkCanAct(nextThem, moveId);
    nextThem = action.pokemon;
    if (!action.canAct) {
      return {
        ...defaultResult(),
        blocked: true,
        effectMessages: action.message ? [action.message] : [],
      };
    }
  }

  const attacker = isAttacking ? nextUs : nextThem;

  const chargeResult = prepareTwoTurnMove(attacker, move);
  if (isAttacking) nextUs = chargeResult.pokemon as PokemonInstance;
  else nextThem = chargeResult.pokemon as PokemonEncounterType;
  if (chargeResult.charging) {
    return {
      ...defaultResult(),
      blocked: true,
      us: nextUs,
      them: nextThem,
      effectMessages: [chargeResult.message || "is charging power!"],
    };
  }

  const resolvedAttacker = isAttacking ? nextUs : nextThem;
  const resolvedDefender = isAttacking ? nextThem : nextUs;

  if (
    resolvedDefender.battle?.chargingInvulnerable &&
    !["swift", "transform"].includes(move.id)
  ) {
    return {
      ...defaultResult(),
      missed: true,
      us: nextUs,
      them: nextThem,
    };
  }

  const effectiveAccuracy = getMoveAccuracy(resolvedAttacker, resolvedDefender, move);
  if (Math.random() * 100 >= effectiveAccuracy) {
    return { ...defaultResult(), missed: true };
  }

  // In Red/Blue, OHKO moves automatically fail against a faster target.
  if (move.meta?.category === "ohko") {
    const attackerSpeed = getGen1BaseSpeed(resolvedAttacker);
    const defenderSpeed = getGen1BaseSpeed(resolvedDefender);
    if (attackerSpeed < defenderSpeed) {
      return {
        ...defaultResult(),
        failed: true,
        effectMessages: ["But it failed!"],
      };
    }

    if (isAttacking) nextThem = { ...nextThem, hp: 0 };
    else nextUs = { ...nextUs, hp: 0 };
    return { ...defaultResult(), us: nextUs, them: nextThem };
  }

  let critical = false;
  let superEffective = false;
  let notVeryEffective = false;
  const damageMessages: string[] = [];

  if (move.power) {
    critical = Math.random() < getGen1CriticalChance(resolvedAttacker, move);
    const defenderMetadata = getPokemonMetadata(resolvedDefender.id);
    const typeEffectiveness = getTypeEffectiveness(
      move.type,
      getGen1PokemonTypes(resolvedDefender.id, defenderMetadata.types)
    );
    superEffective = typeEffectiveness > 1;
    notVeryEffective = typeEffectiveness < 1;
    const perHitDamage = calculateGen1Damage(
      resolvedAttacker,
      resolvedDefender,
      move,
      critical,
      typeEffectiveness
    );
    const hitCount = getGen1HitCount(move.id);
    const damage = perHitDamage * hitCount;

    if (isAttacking) {
      nextThem = { ...nextThem, hp: Math.max(0, nextThem.hp - damage) };
      if (move.id === "struggle") {
        nextUs = {
          ...nextUs,
          hp: Math.max(0, nextUs.hp - Math.max(1, Math.floor(damage / 2))),
        };
      }
    } else {
      nextUs = { ...nextUs, hp: Math.max(0, nextUs.hp - damage) };
      if (move.id === "struggle") {
        nextThem = {
          ...nextThem,
          hp: Math.max(0, nextThem.hp - Math.max(1, Math.floor(damage / 2))),
        };
      }
    }

    if (hitCount > 1) damageMessages.push(`Hit ${hitCount} times!`);
  }

  const effectResult = isAttacking
    ? applyMoveEffects(nextUs, nextThem, move)
    : applyMoveEffects(nextThem, nextUs, move);

  if (isAttacking) {
    nextUs = effectResult.attacker as PokemonInstance;
    nextThem = effectResult.defender as PokemonEncounterType;
  } else {
    nextThem = effectResult.attacker as PokemonEncounterType;
    nextUs = effectResult.defender as PokemonInstance;
  }

  return {
    ...defaultResult(),
    us: nextUs,
    them: nextThem,
    superEffective,
    notVeryEffective,
    critical,
    isBuff: effectResult.isBuff,
    isDebuff: effectResult.isDebuff,
    effectMessages: [...damageMessages, ...effectResult.messages],
  };
};

export default resolveBattleTurn;
