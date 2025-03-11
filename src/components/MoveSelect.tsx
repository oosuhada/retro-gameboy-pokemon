import styled from "styled-components";

import Menu, { MenuItemType } from "./Menu";
import { useSelector } from "react-redux";
import { selectStartMenu } from "../state/uiSlice";
import useIsMobile from "../app/use-is-mobile";
import { selectActivePokemon } from "../state/gameSlice";
import Frame from "./Frame";
import { useState } from "react";
import { getMoveMetadata } from "../app/use-move-metadata";
import { getGen1MoveMetadata } from "../domain/red-blue/catalog";

const Stats = styled.div`
  position: absolute;
  bottom: 20rem;
  right: 45vw;
  display: flex;
  flex-direction: column;
  width: 35rem;
  z-index: 100;

  @media (max-width: 1000px) {
    bottom: 6rem;
    left: 0;
    width: 50%;
  }
`;

const StatsRow = styled.div`
  font-family: "PokemonGB";
  font-size: 3rem;
  text-transform: uppercase;
  text-align: left;
  color: black;
  width: 100%;
  margin-top: 5px;

  @media (max-width: 1000px) {
    font-size: 1rem;
    margin-top: 2px;
  }
`;

interface Props {
  show: boolean;
  select: (move: string) => void;
  close: () => void;
}

const MoveSelect = ({ show, select, close }: Props) => {
  const startMenuOpen = useSelector(selectStartMenu);
  const isMobile = useIsMobile();
  const activePokemon = useSelector(selectActivePokemon);

  const [active, setActive] = useState(0);

  const hasUsableMove = activePokemon.moves.some((move) => move.pp > 0);
  const displayedMoves = hasUsableMove
    ? activePokemon.moves
    : [{ id: "struggle", pp: 1 }];
  const safeActive = Math.min(active, displayedMoves.length - 1);
  const move = getGen1MoveMetadata(
    getMoveMetadata(displayedMoves[safeActive].id)
  );
  const disabledMove = activePokemon.battle?.disabledMove;

  return (
    <>
      <Menu
        tight
        noExitOption
        disabled={startMenuOpen}
        padd={4}
        padding={isMobile ? "100px" : "40vw"}
        show={show}
        menuItems={displayedMoves.map((m) => {
          const moveMetadata = getGen1MoveMetadata(getMoveMetadata(m.id));
          const isDisabled = disabledMove === m.id;
          const item: MenuItemType = {
            label: `${moveMetadata.name}${isDisabled ? " DISABLED" : ""}`,
            action: () => {
              if (hasUsableMove && m.pp <= 0) return;
              if (isDisabled) return;
              select(m.id);
            },
          };
          return item;
        })}
        close={close}
        bottom="0"
        right="0"
        setHovered={(index) => setActive(index)}
      />
      {show && move && (
        <Stats>
          <Frame>
            <StatsRow>Type/</StatsRow>
            <StatsRow style={{ textAlign: "center" }}>{move?.type}</StatsRow>
            <StatsRow
              style={{ textAlign: "right" }}
            >{`${displayedMoves[safeActive].pp}/${move.pp}`}</StatsRow>
          </Frame>
        </Stats>
      )}
    </>
  );
};

export default MoveSelect;
