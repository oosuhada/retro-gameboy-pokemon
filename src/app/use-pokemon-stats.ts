import { getPokemonMetadata } from "./use-pokemon-metadata";
import { GEN1_SPECIES_DATA } from "../domain/red-blue/catalog";

export interface PokemonStats {
  id: number;
  name: string;
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

export const getPokemonStats = (id: number, level: number): PokemonStats => {
  const metadata = getPokemonMetadata(id);
  const gen1 = GEN1_SPECIES_DATA[id];

  if (!gen1) throw new Error(`No Generation I stats for pokemon ${id}`);

  const hp = Math.round((2 * gen1.hp * level) / 100 + level + 10);
  const attack = Math.round((2 * gen1.attack * level) / 100 + 5);
  const defense = Math.round(
    (2 * gen1.defense * level) / 100 + 5
  );
  const special = Math.round((2 * gen1.special * level) / 100 + 5);
  const speed = Math.round((2 * gen1.speed * level) / 100 + 5);

  return {
    id,
    name: metadata.name,
    hp,
    attack,
    defense,
    specialAttack: special,
    specialDefense: special,
    speed,
  };
};

const usePokemonStats = (id: number, level: number): PokemonStats => {
  return getPokemonStats(id, level);
};

export default usePokemonStats;
