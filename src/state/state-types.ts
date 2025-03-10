import { ItemType } from "../app/use-item-data";
import { MapId, TrainerType } from "../maps/map-types";

export interface InventoryItemType {
  item: ItemType;
  amount: number;
}

export enum Direction {
  Down = "down",
  Up = "up",
  Left = "left",
  Right = "right",
}

export interface PosType {
  x: number;
  y: number;
}

export interface MoveState {
  id: string;
  pp: number;
}

export type MajorStatusCondition =
  | "burn"
  | "freeze"
  | "paralysis"
  | "poison"
  | "toxic"
  | "sleep";

export interface BattleStatStages {
  attack: number;
  defense: number;
  speed: number;
  special: number;
  accuracy: number;
  evasion: number;
}

export interface BattleState {
  stages: BattleStatStages;
  leechSeeded?: boolean;
  toxicCounter?: number;
  confusionTurns?: number;
  disabledMove?: string;
  disableTurns?: number;
  chargingMove?: string;
  chargingInvulnerable?: boolean;
}

export interface PokemonInstance {
  id: number;
  level: number;
  xp: number;
  hp: number;
  moves: MoveState[];
  status?: MajorStatusCondition;
  statusTurns?: number;
  battle?: BattleState;
}

export interface PokemonEncounterType {
  id: number;
  level: number;
  hp: number;
  moves: string[];
  status?: MajorStatusCondition;
  statusTurns?: number;
  battle?: BattleState;
}

export interface GameState {
  pos: PosType;
  jumping: boolean;
  moving: boolean;
  direction: Direction;
  map: MapId;
  inventory: InventoryItemType[];
  name: string;
  pokemon: PokemonInstance[];
  pc: PokemonInstance[];
  activePokemonIndex: number;
  trainerEncounter?: TrainerType;
  pokemonEncounter?: PokemonEncounterType;
  money: number;
  defeatedTrainers: string[];
  collectedItems: string[];
  completedQuests: string[];
  seenPokemon: number[];
}
