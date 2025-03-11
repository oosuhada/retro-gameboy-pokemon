import { useMemo } from "react";
import { useSelector } from "react-redux";
import styled from "styled-components";
import { getPokemonMetadata } from "../app/use-pokemon-metadata";
import useEvent from "../app/use-event";
import { Event } from "../app/emitter";
import {
  selectPc,
  selectPokemon,
  selectSeenPokemon,
} from "../state/gameSlice";
import Menu from "./Menu";

const PokedexFrame = styled.div`
  position: absolute;
  inset: 0;
  z-index: 110;
  background: var(--bg);
`;

const Header = styled.div`
  position: absolute;
  z-index: 120;
  left: 0;
  top: 0;
  width: 58%;
  padding: 16px 22px;
  background: var(--bg);
  border: 8px double black;
  box-sizing: border-box;
  text-transform: uppercase;
  font-size: 2rem;
  line-height: 1.25;

  @media (max-width: 1000px) {
    padding: 6px 8px;
    border-width: 3px;
    font-size: 0.72rem;
  }
`;

const Help = styled.div`
  position: absolute;
  z-index: 120;
  left: 0;
  bottom: 0;
  width: 58%;
  padding: 14px 22px;
  background: var(--bg);
  border: 8px double black;
  box-sizing: border-box;
  font-size: 1.4rem;

  @media (max-width: 1000px) {
    padding: 5px 8px;
    border-width: 3px;
    font-size: 0.58rem;
  }
`;

interface Props {
  close: () => void;
}

const Pokedex = ({ close }: Props) => {
  const seenPokemon = useSelector(selectSeenPokemon);
  const party = useSelector(selectPokemon);
  const pc = useSelector(selectPc);

  const caughtPokemon = useMemo(
    () => new Set([...party, ...pc].map((pokemon) => pokemon.id)),
    [party, pc]
  );

  const seenSet = useMemo(() => new Set(seenPokemon), [seenPokemon]);

  useEvent(Event.B, close);

  const menuItems = Array.from({ length: 151 }, (_, index) => {
    const id = index + 1;
    const seen = seenSet.has(id);
    const caught = caughtPokemon.has(id);
    const metadata = getPokemonMetadata(id);
    const number = String(id).padStart(3, "0");
    const name = seen ? metadata.name.toUpperCase() : "----------";

    return {
      label: `${caught ? "●" : seen ? "○" : " "} ${number} ${name}`,
      action: () => {},
    };
  });

  return (
    <PokedexFrame>
      <Header>
        POKéDEX<br />
        SEEN {String(seenSet.size).padStart(3, "0")} &nbsp; OWN {" "}
        {String(caughtPokemon.size).padStart(3, "0")}
      </Header>
      <Menu
        show
        menuItems={menuItems}
        close={close}
        noExitOption
        top="0"
        right="0"
      />
      <Help>● OWNED &nbsp; ○ SEEN &nbsp; B: CANCEL</Help>
    </PokedexFrame>
  );
};

export default Pokedex;
