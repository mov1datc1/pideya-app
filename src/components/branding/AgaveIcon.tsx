import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme';

interface AgaveIconProps {
  size?: number;
  color?: string;
}

export const AgaveIcon: React.FC<AgaveIconProps> = ({
  size = 48,
  color = colors.agave,
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* Penca central */}
      <Path
        d="M50 85 C50 85, 46 55, 48 30 C49 20, 51 20, 52 30 C54 55, 50 85, 50 85Z"
        fill={color}
      />
      {/* Pencas laterales izquierdas */}
      <Path
        d="M48 65 C48 65, 30 50, 22 35 C18 28, 22 26, 26 32 C34 44, 48 60, 48 65Z"
        fill={color}
        opacity={0.85}
      />
      <Path
        d="M46 50 C46 50, 25 42, 15 30 C11 25, 15 22, 19 27 C28 37, 46 48, 46 50Z"
        fill={color}
        opacity={0.7}
      />
      {/* Pencas laterales derechas */}
      <Path
        d="M52 65 C52 65, 70 50, 78 35 C82 28, 78 26, 74 32 C66 44, 52 60, 52 65Z"
        fill={color}
        opacity={0.85}
      />
      <Path
        d="M54 50 C54 50, 75 42, 85 30 C89 25, 85 22, 81 27 C72 37, 54 48, 54 50Z"
        fill={color}
        opacity={0.7}
      />
      {/* Punta (jimador cut) */}
      <Path
        d="M50 30 C49 25, 48 18, 50 12 C52 18, 51 25, 50 30Z"
        fill={color}
      />
    </Svg>
  );
};
