import { MoveMetadata } from "../../app/move-metadata";
import {
  GEN1_SPECIES_DATA,
  getGen1MoveMetadata,
  getGen1PokemonTypes,
  normalizeGen1MoveId,
} from "./catalog";
import { getPokemonMetadata } from "../../app/use-pokemon-metadata";
import { getPokemonStats } from "../../app/use-pokemon-stats";
import {
  BattleState,
  BattleStatStages,
  MajorStatusCondition,
  PokemonEncounterType,
  PokemonInstance,
} from "../../state/state-types";

export type BattlePokemon = PokemonInstance | PokemonEncounterType;

export type BattleStatName = keyof BattleStatStages;

export interface ActionCheck<T extends BattlePokemon> {
  pokemon: T;
  canAct: boolean;
  message?: string;
}

export interface MoveEffectResult<A extends BattlePokemon, D extends BattlePokemon> {
  attacker: A;
  defender: D;
  messages: string[];
  isBuff: boolean;
  isDebuff: boolean;
}

export interface EndTurnResult {
  us: PokemonInstance;
  them: PokemonEncounterType;
  messages: string[];
}

const EMPTY_STAGES: BattleStatStages = {
  attack: 0,
  defense: 0,
  speed: 0,
  special: 0,
  accuracy: 0,
  evasion: 0,
};

const STATUS_LABELS: Record<MajorStatusCondition, string> = {
  burn: "BRN",
  freeze: "FRZ",
  paralysis: "PAR",
  poison: "PSN",
  toxic: "PSN",
  sleep: "SLP",
};

const GEN1_PHYSICAL_TYPES = new Set([
  "normal",
  "fighting",
  "flying",
  "poison",
  "ground",
  "rock",
  "bug",
  "ghost",
]);

const TWO_TURN_MOVES = new Set([
  "razorwind",
  "fly",
  "dig",
  "solarbeam",
  "skullbash",
  "skyattack",
]);

const INVULNERABLE_CHARGE_MOVES = new Set(["fly", "dig"]);

const FIXED_TWO_HIT_MOVES = new Set(["doublekick", "twineedle", "bonemerang"]);

const VARIABLE_MULTI_HIT_MOVES = new Set([
  "doubleslap",
  "cometpunch",
  "furyattack",
  "pinmissile",
  "spikecannon",
  "barrage",
  "furyswipes",
]);

const CONFUSION_MOVES = new Set(["confuseray", "supersonic"]);

const clampStage = (stage: number) => Math.max(-6, Math.min(6, stage));

export const createBattleState = (): BattleState => ({
  stages: { ...EMPTY_STAGES },
});

export const clearVolatileBattleState = <T extends BattlePokemon>(pokemon: T): T => {
  const { battle: _battle, ...rest } = pokemon;
  return rest as T;
};

export const getBattleState = (pokemon: BattlePokemon): BattleState => ({
  ...createBattleState(),
  ...pokemon.battle,
  stages: {
    ...EMPTY_STAGES,
    ...pokemon.battle?.stages,
  },
});

export const getStatusLabel = (status?: MajorStatusCondition) =>
  status ? STATUS_LABELS[status] : "";

const updateStage = <T extends BattlePokemon>(
  pokemon: T,
  stat: BattleStatName,
  amount: number
): T => {
  const battle = getBattleState(pokemon);
  return {
    ...pokemon,
    battle: {
      ...battle,
      stages: {
        ...battle.stages,
        [stat]: clampStage(battle.stages[stat] + amount),
      },
    },
  };
};

const normalStageMultiplier = (stage: number) =>
  stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage);

const accuracyStageMultiplier = (stage: number) =>
  stage >= 0 ? (3 + stage) / 3 : 3 / (3 - stage);

export const getEffectiveSpeed = (pokemon: BattlePokemon) => {
  const stats = getPokemonStats(pokemon.id, pokemon.level);
  const stage = getBattleState(pokemon).stages.speed;
  const paralysisMultiplier = pokemon.status === "paralysis" ? 0.25 : 1;
  return stats.speed * normalStageMultiplier(stage) * paralysisMultiplier;
};

export const getGen1BaseSpeed = (pokemon: BattlePokemon) =>
  GEN1_SPECIES_DATA[pokemon.id]?.speed ?? 1;

const getEffectiveBattleStat = (
  pokemon: BattlePokemon,
  stat: "attack" | "defense" | "special",
  ignoreStages: boolean
) => {
  const stats = getPokemonStats(pokemon.id, pokemon.level);
  const stages = getBattleState(pokemon).stages;

  let base = stats.attack;
  if (stat === "defense") base = stats.defense;
  if (stat === "special") base = stats.specialAttack;

  const stageMultiplier = ignoreStages ? 1 : normalStageMultiplier(stages[stat]);
  const burnMultiplier =
    stat === "attack" && pokemon.status === "burn" && !ignoreStages ? 0.5 : 1;
  return base * stageMultiplier * burnMultiplier;
};

export const getMoveAccuracy = (
  attacker: BattlePokemon,
  defender: BattlePokemon,
  move: MoveMetadata
) => {
  const gen1Move = getGen1MoveMetadata(move);
  if (gen1Move.id === "swift") return 100;
  if (gen1Move.accuracy === null) return 255 / 256 * 100;
  const attackerAccuracy = getBattleState(attacker).stages.accuracy;
  const defenderEvasion = getBattleState(defender).stages.evasion;
  return Math.max(
    1,
    Math.min(
      (255 / 256) * 100,
      gen1Move.accuracy *
        accuracyStageMultiplier(attackerAccuracy) /
        accuracyStageMultiplier(defenderEvasion)
    )
  );
};

export const getGen1CriticalChance = (pokemon: BattlePokemon, move: MoveMetadata) => {
  const baseSpeed = getGen1BaseSpeed(pokemon);
  const baseThreshold = Math.floor(baseSpeed / 2);
  const threshold = move.meta?.critRate
    ? Math.min(baseThreshold * 8, 255)
    : baseThreshold;
  return threshold / 256;
};

export const getGen1HitCount = (moveId: string) => {
  const normalized = normalizeGen1MoveId(moveId);
  if (FIXED_TWO_HIT_MOVES.has(normalized)) return 2;
  if (!VARIABLE_MULTI_HIT_MOVES.has(normalized)) return 1;

  // Generation I variable multi-hit distribution: 2/3 hits are 3/8 each,
  // while 4/5 hits are 1/8 each.
  const roll = Math.floor(Math.random() * 8);
  if (roll <= 2) return 2;
  if (roll <= 5) return 3;
  if (roll === 6) return 4;
  return 5;
};

export const prepareTwoTurnMove = <T extends BattlePokemon>(
  pokemon: T,
  move: MoveMetadata
): { pokemon: T; charging: boolean; message?: string } => {
  const normalized = normalizeGen1MoveId(move.id);
  if (!TWO_TURN_MOVES.has(normalized)) return { pokemon, charging: false };

  const battle = getBattleState(pokemon);
  if (normalizeGen1MoveId(battle.chargingMove ?? "") === normalized) {
    return {
      pokemon: {
        ...pokemon,
        battle: {
          ...battle,
          chargingMove: undefined,
          chargingInvulnerable: false,
        },
      },
      charging: false,
    };
  }

  const messages: Record<string, string> = {
    razorwind: "made a whirlwind!",
    fly: "flew up high!",
    dig: "dug a hole!",
    solarbeam: "took in sunlight!",
    skullbash: "lowered its head!",
    skyattack: "is glowing!",
  };

  return {
    pokemon: {
      ...pokemon,
      battle: {
        ...battle,
        chargingMove: move.id,
        chargingInvulnerable: INVULNERABLE_CHARGE_MOVES.has(normalized),
      },
    },
    charging: true,
    message: messages[normalized] ?? "is charging power!",
  };
};

export const getForcedChargingMove = (pokemon: BattlePokemon) =>
  getBattleState(pokemon).chargingMove;

export const calculateGen1Damage = (
  attacker: BattlePokemon,
  defender: BattlePokemon,
  move: MoveMetadata,
  critical: boolean,
  typeEffectiveness: number
) => {
  if (!move.power) return 0;
  const attackerMetadata = getPokemonMetadata(attacker.id);
  // Red/Blue determines physical vs. special by move TYPE, not per-move class.
  const usesPhysical = GEN1_PHYSICAL_TYPES.has(move.type);
  const attack = getEffectiveBattleStat(
    attacker,
    usesPhysical ? "attack" : "special",
    critical
  );
  const defense = getEffectiveBattleStat(
    defender,
    usesPhysical ? "defense" : "special",
    critical
  );
  const effectiveLevel = critical ? attacker.level * 2 : attacker.level;
  const stab = getGen1PokemonTypes(attacker.id, attackerMetadata.types).includes(
    move.type
  )
    ? 1.5
    : 1;
  const randomFactor = (217 + Math.floor(Math.random() * 39)) / 255;

  return Math.max(
    1,
    Math.floor(
      (((((2 * effectiveLevel) / 5 + 2) * move.power * (attack / defense)) / 50 +
        2) *
        stab *
        typeEffectiveness *
        randomFactor)
    )
  );
};

const randomSleepTurns = () => 1 + Math.floor(Math.random() * 7);

export const checkCanAct = <T extends BattlePokemon>(
  pokemon: T,
  selectedMoveId?: string
): ActionCheck<T> => {
  if (pokemon.status === "freeze") {
    return { pokemon, canAct: false, message: "is frozen solid!" };
  }

  if (pokemon.status === "sleep") {
    const turns = pokemon.statusTurns ?? randomSleepTurns();
    const remaining = Math.max(0, turns - 1);
    if (remaining === 0) {
      return {
        pokemon: { ...pokemon, status: undefined, statusTurns: undefined },
        canAct: false,
        message: "woke up!",
      };
    }
    return {
      pokemon: { ...pokemon, statusTurns: remaining },
      canAct: false,
      message: "is fast asleep!",
    };
  }

  const battle = getBattleState(pokemon);
  if ((battle.confusionTurns ?? 0) > 0) {
    const remaining = Math.max(0, (battle.confusionTurns ?? 0) - 1);
    let confusedPokemon = {
      ...pokemon,
      battle: {
        ...battle,
        confusionTurns: remaining || undefined,
      },
    } as T;

    if (Math.random() < 0.5) {
      const attack = getEffectiveBattleStat(confusedPokemon, "attack", false);
      const defense = getEffectiveBattleStat(confusedPokemon, "defense", false);
      const damage = Math.max(
        1,
        Math.floor(
          (((2 * confusedPokemon.level) / 5 + 2) * 40 * (attack / defense)) / 50 + 2
        )
      );
      confusedPokemon = {
        ...confusedPokemon,
        hp: Math.max(0, confusedPokemon.hp - damage),
      } as T;
      return {
        pokemon: confusedPokemon,
        canAct: false,
        message: "is confused! It hurt itself in its confusion!",
      };
    }
  }

  if (pokemon.status === "paralysis" && Math.random() < 0.25) {
    return { pokemon, canAct: false, message: "is fully paralyzed!" };
  }

  if ((battle.disableTurns ?? 0) > 0) {
    const remaining = Math.max(0, (battle.disableTurns ?? 0) - 1);
    const disabledMove = battle.disabledMove;
    const nextPokemon = {
      ...pokemon,
      battle: {
        ...battle,
        disableTurns: remaining || undefined,
        disabledMove: remaining ? disabledMove : undefined,
      },
    } as T;

    if (remaining > 0 && disabledMove && selectedMoveId === disabledMove) {
      return {
        pokemon: nextPokemon,
        canAct: false,
        message: `${disabledMove.toUpperCase()} is disabled!`,
      };
    }

    return { pokemon: nextPokemon, canAct: true };
  }

  return { pokemon, canAct: true };
};

const normalizeAilment = (ailment: string): MajorStatusCondition | null => {
  if (ailment === "burn") return "burn";
  if (ailment === "freeze") return "freeze";
  if (ailment === "paralysis") return "paralysis";
  if (ailment === "poison") return "poison";
  if (ailment === "bad-poison") return "toxic";
  if (ailment === "sleep") return "sleep";
  return null;
};

const STAT_ALIASES: Record<string, BattleStatName> = {
  attack: "attack",
  defense: "defense",
  speed: "speed",
  special: "special",
  "special attack": "special",
  "special defense": "special",
  accuracy: "accuracy",
  evasion: "evasion",
};

const parseStageAmount = (direction: string, amount?: string) => {
  const magnitude = amount?.toLowerCase() === "two" ? 2 : 1;
  return direction.toLowerCase() === "raises" ? magnitude : -magnitude;
};

const applyStatTextEffects = <A extends BattlePokemon, D extends BattlePokemon>(
  attacker: A,
  defender: D,
  move: MoveMetadata,
  shouldApply: boolean
) => {
  let nextAttacker = attacker;
  let nextDefender = defender;
  let isBuff = false;
  let isDebuff = false;
  const messages: string[] = [];
  if (!shouldApply) return { attacker, defender, messages, isBuff, isDebuff };

  const regex = /(Raises|Lowers) the (user's|target's) (Attack|Defense|Speed|Special Attack|Special Defense|Special|accuracy|evasion)(?: by (one|two) stages?)?/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(move.effect)) !== null) {
    const stat = STAT_ALIASES[match[3].toLowerCase()];
    if (!stat) continue;
    const amount = parseStageAmount(match[1], match[4]);
    const targetsUser = match[2].toLowerCase().startsWith("user");
    if (targetsUser) {
      nextAttacker = updateStage(nextAttacker, stat, amount);
      isBuff = amount > 0 || isBuff;
      isDebuff = amount < 0 || isDebuff;
    } else {
      nextDefender = updateStage(nextDefender, stat, amount);
      isBuff = amount < 0 || isBuff;
      isDebuff = amount > 0 || isDebuff;
    }
    messages.push(
      `${targetsUser ? "User's" : "Target's"} ${stat.toUpperCase()} ${
        amount > 0 ? "rose!" : "fell!"
      }`
    );
  }

  return {
    attacker: nextAttacker,
    defender: nextDefender,
    messages,
    isBuff,
    isDebuff,
  };
};

export const applyMoveEffects = <A extends BattlePokemon, D extends BattlePokemon>(
  attacker: A,
  defender: D,
  move: MoveMetadata
): MoveEffectResult<A, D> => {
  let nextAttacker = attacker;
  let nextDefender = defender;
  const messages: string[] = [];
  let isBuff = false;
  let isDebuff = false;

  const normalizedMoveId = normalizeGen1MoveId(move.id);

  if (normalizedMoveId === "disable") {
    const moveIds = "moves" in nextDefender
      ? nextDefender.moves
          .map((candidate: any) =>
            typeof candidate === "string"
              ? candidate
              : candidate.pp > 0
              ? candidate.id
              : null
          )
          .filter(Boolean) as string[]
      : [];

    if (moveIds.length > 0) {
      const disabledMove = moveIds[Math.floor(Math.random() * moveIds.length)];
      const battle = getBattleState(nextDefender);
      nextDefender = {
        ...nextDefender,
        battle: {
          ...battle,
          disabledMove,
          disableTurns: 1 + Math.floor(Math.random() * 8),
          chargingMove:
            battle.chargingMove === disabledMove ? undefined : battle.chargingMove,
          chargingInvulnerable:
            battle.chargingMove === disabledMove
              ? false
              : battle.chargingInvulnerable,
        },
      };
      messages.push(`${disabledMove.toUpperCase()} was disabled!`);
      isDebuff = true;
    }
  }

  const confusionChance =
    CONFUSION_MOVES.has(normalizedMoveId)
      ? 100
      : move.meta?.ailment === "confusion"
      ? move.meta?.ailmentChance ?? move.effectChance ?? 0
      : 0;
  if (confusionChance > 0 && Math.random() * 100 < confusionChance) {
    const battle = getBattleState(nextDefender);
    if (!(battle.confusionTurns ?? 0)) {
      nextDefender = {
        ...nextDefender,
        battle: {
          ...battle,
          confusionTurns: 2 + Math.floor(Math.random() * 4),
        },
      };
      messages.push("Target became confused!");
      isDebuff = true;
    }
  }

  const status =
    normalizedMoveId === "toxic"
      ? "toxic"
      : normalizeAilment(move.meta?.ailment ?? "none");
  const ailmentChance =
    normalizedMoveId === "toxic"
      ? 100
      : move.damageClass === "status"
      ? 100
      : move.meta?.ailmentChance ?? 0;
  const defenderTypes = getGen1PokemonTypes(
    nextDefender.id,
    getPokemonMetadata(nextDefender.id).types
  );
  const statusBlocked =
    (status === "toxic" || status === "poison") && defenderTypes.includes("poison");
  if (
    status &&
    !statusBlocked &&
    !nextDefender.status &&
    Math.random() * 100 < ailmentChance
  ) {
    nextDefender = {
      ...nextDefender,
      status,
      statusTurns: status === "sleep" ? randomSleepTurns() : undefined,
      battle:
        status === "toxic"
          ? { ...getBattleState(nextDefender), toxicCounter: 1 }
          : nextDefender.battle,
    };
    messages.push(
      `Target was ${
        status === "paralysis"
          ? "paralyzed"
          : status === "toxic"
          ? "badly poisoned"
          : status
      }!`
    );
    isDebuff = true;
  }

  if (
    move.id === "leech-seed" &&
    !getGen1PokemonTypes(
      nextDefender.id,
      getPokemonMetadata(nextDefender.id).types
    ).includes("grass")
  ) {
    nextDefender = {
      ...nextDefender,
      battle: {
        ...getBattleState(nextDefender),
        leechSeeded: true,
      },
    };
    messages.push("Target was seeded!");
    isDebuff = true;
  }

  const statChance =
    move.damageClass === "status" ? 100 : move.meta?.statChance ?? 0;
  const statResult = applyStatTextEffects(
    nextAttacker,
    nextDefender,
    move,
    Math.random() * 100 < statChance
  );
  nextAttacker = statResult.attacker;
  nextDefender = statResult.defender;
  messages.push(...statResult.messages);
  isBuff = isBuff || statResult.isBuff;
  isDebuff = isDebuff || statResult.isDebuff;

  if ((move.meta?.healing ?? 0) > 0) {
    const maxHp = getPokemonStats(nextAttacker.id, nextAttacker.level).hp;
    const healed = Math.max(
      1,
      Math.floor((maxHp * (move.meta?.healing ?? 0)) / 100)
    );
    nextAttacker = {
      ...nextAttacker,
      hp: Math.min(maxHp, nextAttacker.hp + healed),
    };
    messages.push("HP was restored!");
    isBuff = true;
  }

  if (move.id === "rest") {
    const maxHp = getPokemonStats(nextAttacker.id, nextAttacker.level).hp;
    nextAttacker = {
      ...nextAttacker,
      hp: maxHp,
      status: "sleep",
      statusTurns: 2,
    };
    messages.push("Fell asleep and became healthy!");
    isBuff = true;
  }

  return {
    attacker: nextAttacker,
    defender: nextDefender,
    messages,
    isBuff,
    isDebuff,
  };
};

const applyResidual = <T extends BattlePokemon>(pokemon: T) => {
  if (
    pokemon.status !== "poison" &&
    pokemon.status !== "toxic" &&
    pokemon.status !== "burn"
  ) {
    return { pokemon, damage: 0 };
  }
  const maxHp = getPokemonStats(pokemon.id, pokemon.level).hp;
  const battle = getBattleState(pokemon);
  const toxicCounter = pokemon.status === "toxic" ? battle.toxicCounter ?? 1 : 1;
  const damage = Math.max(1, Math.floor(maxHp / 16) * toxicCounter);
  return {
    pokemon: {
      ...pokemon,
      hp: Math.max(0, pokemon.hp - damage),
      battle:
        pokemon.status === "toxic"
          ? { ...battle, toxicCounter: Math.min(15, toxicCounter + 1) }
          : pokemon.battle,
    },
    damage,
  };
};

export const applyEndTurnEffects = (
  us: PokemonInstance,
  them: PokemonEncounterType
): EndTurnResult => {
  let nextUs = us;
  let nextThem = them;
  const messages: string[] = [];

  const usResidual = applyResidual(nextUs);
  nextUs = usResidual.pokemon;
  if (usResidual.damage > 0) messages.push("Your POKéMON is hurt by its status!");

  const themResidual = applyResidual(nextThem);
  nextThem = themResidual.pokemon;
  if (themResidual.damage > 0) messages.push("Enemy POKéMON is hurt by its status!");

  if (getBattleState(nextUs).leechSeeded && nextUs.hp > 0 && nextThem.hp > 0) {
    const amount = Math.max(1, Math.floor(getPokemonStats(nextUs.id, nextUs.level).hp / 16));
    const enemyMaxHp = getPokemonStats(nextThem.id, nextThem.level).hp;
    nextUs = { ...nextUs, hp: Math.max(0, nextUs.hp - amount) };
    nextThem = { ...nextThem, hp: Math.min(enemyMaxHp, nextThem.hp + amount) };
    messages.push("LEECH SEED sapped your POKéMON!");
  }

  if (getBattleState(nextThem).leechSeeded && nextThem.hp > 0 && nextUs.hp > 0) {
    const amount = Math.max(
      1,
      Math.floor(getPokemonStats(nextThem.id, nextThem.level).hp / 16)
    );
    const playerMaxHp = getPokemonStats(nextUs.id, nextUs.level).hp;
    nextThem = { ...nextThem, hp: Math.max(0, nextThem.hp - amount) };
    nextUs = { ...nextUs, hp: Math.min(playerMaxHp, nextUs.hp + amount) };
    messages.push("LEECH SEED sapped the enemy!");
  }

  return { us: nextUs, them: nextThem, messages };
};
