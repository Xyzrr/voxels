import styled from 'styled-components';

export const CrosshairWrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
`;

export const Crosshair = styled.div`
  position: relative;
  opacity: 0.4;
`;

export const CrosshairVertical = styled.div`
  position: absolute;
  width: 2px;
  height: 20px;
  left: -1px;
  top: -10px;
  background: white;
`;

export const CrosshairHorizontal = styled.div`
  position: absolute;
  width: 20px;
  height: 2px;
  left: -10px;
  top: -1px;
  background: white;
`;
