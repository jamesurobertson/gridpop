[33mcommit f427da18715f269808fd719ad6388d2094cd1a99[m[33m ([m[1;36mHEAD -> [m[1;32mmain[m[33m, [m[1;31morigin/main[m[33m, [m[1;31morigin/HEAD[m[33m)[m
Author: ephramcode <ephram247@gmail.com>
Date:   Fri May 9 20:22:00 2025 -0700

    hide options 3

[33mcommit 4e247f6651e15aecb2b554fde06e6d55f4a8702e[m
Author: ephramcode <ephram247@gmail.com>
Date:   Fri May 9 20:17:54 2025 -0700

    hide options menu

[33mcommit 56674509f3ca682411c3d7ecc11f069485e06e0a[m
Author: ephramcode <ephram247@gmail.com>
Date:   Fri May 9 20:12:43 2025 -0700

    hide options menu

[33mcommit beab747f06c4ffa0bd6fa1f0132aeb5ac5e77e69[m
Author: ephramcode <ephram247@gmail.com>
Date:   Fri May 9 20:07:54 2025 -0700

    dashed line dark color

[33mcommit 477c549e6b68340a9d773f6f418e19b1632d14b1[m
Author: ephramcode <ephram247@gmail.com>
Date:   Fri May 9 19:56:27 2025 -0700

    mine time is .5 seconds

[33mcommit ee2e0f713af439761bbdcf44e8448470f533ea96[m
Author: gpt-engineer-app[bot] <159125892+gpt-engineer-app[bot]@users.noreply.github.com>
Date:   Sat May 10 02:50:15 2025 +0000

    Fix: Clarify game rules and remove mobile instructions
    
    Clarify the rules for clearing rows and columns in the "How to Play" section.
    Remove mobile instructions.

[33mcommit 2e99146438c35f6fa3cecc0271a52e77e214e02c[m
Author: gpt-engineer-app[bot] <159125892+gpt-engineer-app[bot]@users.noreply.github.com>
Date:   Sat May 10 02:47:09 2025 +0000

    Fix: Update default keybindings
    
    Change the default keybindings for rotate and hold actions.

[33mcommit f97e3d84cccf24d038203d2dd5a22d82599bad43[m
Author: gpt-engineer-app[bot] <159125892+gpt-engineer-app[bot]@users.noreply.github.com>
Date:   Sat May 10 02:44:00 2025 +0000

    Refactor: Remove controls button and modal
    
    Removed the controls button and modal, integrating controls into the options window. Adjusted the pause and options buttons to be side by side. Removed the settings icon and added how-to-play instructions.

[33mcommit 669a3aeabf799c268ed6448a762006bbf5d547a8[m
Author: gpt-engineer-app[bot] <159125892+gpt-engineer-app[bot]@users.noreply.github.com>
Date:   Sat May 10 02:39:48 2025 +0000

    Fix: Adjust layout for larger grid size
    
    Adjust the layout of the game components to ensure they fit and are visible on the screen with the increased grid size.

[33mcommit 7d9413b0fef815e955352dcfe2847962a60af817[m
Author: gpt-engineer-app[bot] <159125892+gpt-engineer-app[bot]@users.noreply.github.com>
Date:   Sat May 10 02:37:19 2025 +0000

    feat: Adjust game board size and colors
    
    - Increased the game board size to 500x500.
    - Removed the controls button.
    - Swapped the colors for cell values 1 and 5.

[33mcommit 5e023374111ef33395200846fee1a2ae6322efb0[m
Author: ephramcode <ephram247@gmail.com>
Date:   Fri May 9 17:04:52 2025 -0700

    remove settings icon

[33mcommit d94069b758d01226291ac913f64cc528a36ce4f7[m
Author: ephramcode <ephram247@gmail.com>
Date:   Fri May 9 17:00:55 2025 -0700

    fix highscore tab ui

[33mcommit 1c7ffa1a9deee51bc8e863a70314e4f47cbdd835[m
Author: ephramcode <ephram247@gmail.com>
Date:   Fri May 9 16:55:50 2025 -0700

    remove margin on settings icon

[33mcommit 69af4d95a8a04a1c23fc88836bc664595ac4eca0[m
Author: ephramcode <ephram247@gmail.com>
Date:   Fri May 9 16:51:19 2025 -0700

    unused import

[33mcommit 9cbae7cca56fb917e9838987809c72ff3486978e[m
Author: gpt-engineer-app[bot] <159125892+gpt-engineer-app[bot]@users.noreply.github.com>
Date:   Fri May 9 22:25:57 2025 +0000

    Fix: Improve options and game over UI
    
    - Improved the layout and styling of the options button.
    - Removed the WASD control scheme option.
    - Styled the high scores panel in the game over modal.
    - Changed the color of the buttons in the game over modal.

[33mcommit 9202bf858706c4d895a016bb30f98b45caa7f564[m
Author: gpt-engineer-app[bot] <159125892+gpt-engineer-app[bot]@users.noreply.github.com>
Date:   Fri May 9 22:20:57 2025 +0000

    Fix: Resolve import errors in GameBoard and OptionsMenu
    
    -   Import GRID\_SIZE from gameLogic.ts in GameBoard.tsx
    -   Import Grid4x4 from lucide-react in OptionsMenu.tsx
    -   Fix type errors in gameLogic.ts

[33mcommit 9f85d7ffcc2951e1f53bb5c020c3794cfd5af532[m
Author: gpt-engineer-app[bot] <159125892+gpt-engineer-app[bot]@users.noreply.github.com>
Date:   Fri May 9 22:18:35 2025 +0000

    feat: Persist controls and add grid size option
    
    - Persist the customizable controls across refreshes using local storage.
    - Add an options menu to choose between 4x4 and 5x5 grid sizes.

[33mcommit 10a872a2127d94d63d43b91b8b57e3042d12472c[m
Author: gpt-engineer-app[bot] <159125892+gpt-engineer-app[bot]@users.noreply.github.com>
Date:   Fri May 9 22:01:28 2025 +0000

    feat: Implement customizable controls
    
    Allow users to customize game controls through a settings panel.

[33mcommit ee160c784765b453442c93fb4b30e28841b52fa3[m
Author: gpt-engineer-app[bot] <159125892+gpt-engineer-app[bot]@users.noreply.github.com>
Date:   Fri May 9 03:55:35 2025 +0000

    Fix: Update high score tab and remove game title
    
    - Updated the high score tab to match the theme of other buttons.
    - Removed the game title from all locations.

[33mcommit ba3708bb2850f4bab51248d8fa8ac4cf6f37373e[m
Author: gpt-engineer-app[bot] <159125892+gpt-engineer-app[bot]@users.noreply.github.com>
Date:   Fri May 9 03:52:21 2025 +0000

    Fix: Adjust ghost piece outline inset
    
    Change the inset of the dashed ghost placement line to be -4px.

[33mcommit 15a6951366ccd7704dc3b4b8cbf76ed6d0537c1c[m
Author: gpt-engineer-app[bot] <159125892+gpt-engineer-app[bot]@users.noreply.github.com>
Date:   Fri May 9 03:46:26 2025 +0000

    feat: Improve theming and grid size
    
    - Updated high score tab theming.
    - Adjusted ghost piece outline margin.
    - Changed game grid size to 4x4.
    - Modified "next" and "hold" piece colors.

[33mcommit d5be5e37ae7becf68f59f58b25e62bb87046c73a[m
Author: gpt-engineer-app[bot] <159125892+gpt-engineer-app[bot]@users.noreply.github.com>
Date:   Fri May 9 03:37:24 2025 +0000

    feat: Improve game board visuals and UI
    
    - Adjust ghost piece outline spacing and color.
    - Remove redundant title.
    - Style controls button to match pause button.
    - Update high score tab styling.

[33mcommit 6ba0aa58ae560b4063775e1782003d13526e4688[m
Author: gpt-engineer-app[bot] <159125892+gpt-engineer-app[bot]@users.noreply.github.com>
Date:   Thu May 8 20:36:05 2025 +0000

    feat: Update game visuals and UI elements
    
    - Updated cell colors and text colors based on the provided color palette.
    - Adjusted ghost piece outline to improve clarity.
    - Removed redundant text element.

[33mcommit 8831a15ee128681088ce674730c6be19915f10ed[m
Author: gpt-engineer-app[bot] <159125892+gpt-engineer-app[bot]@users.noreply.github.com>
Date:   Thu May 8 20:25:47 2025 +0000

    Refactor: Update game cell visuals
    
    Update cell colors and game board styling.

[33mcommit fa25ffd0b6245ec74b962e8659c9019578f763e9[m
Author: gpt-engineer-app[bot] <159125892+gpt-engineer-app[bot]@users.noreply.github.com>
Date:   Thu May 8 20:22:17 2025 +0000

    feat: Improve game visuals
    
    - Implement background colors for tiles based on cell values.
    - Style the timer countdown with a green color.
    - Apply consistent button styling.
    - Enhance the drop outline appearance.

[33mcommit 82903dc245f21330fea004e238e9e5e8c5556199[m
Author: gpt-engineer-app[bot] <159125892+gpt-engineer-app[bot]@users.noreply.github.com>
Date:   Thu May 8 20:03:30 2025 +0000

    Refactor: Implement game features
    
    This commit implements the core game features, including game logic, user controls, and UI elements.

[33mcommit 6dac856f2520250713decadf980457a42deb7e3a[m
Author: gpt-engineer-app[bot] <159125892+gpt-engineer-app[bot]@users.noreply.github.com>
Date:   Mon May 5 17:25:12 2025 +0000

    Refactor: Implement game logic changes
    
    This commit includes changes to the game logic, including score calculation, row clearing, and game over conditions.

[33mcommit 15b42670ad2c5ae8340463283e3cae0e7e5364f1[m
Author: gpt-engineer-app[bot] <159125892+gpt-engineer-app[bot]@users.noreply.github.com>
Date:   Mon May 5 01:17:41 2025 +0000

    Refactor: Implement the plan

[33mcommit 3d0ab2835383efb04f3f7437030313dda2249bd8[m
Author: gpt-engineer-app[bot] <159125892+gpt-engineer-app[bot]@users.noreply.github.com>
Date:   Sat May 3 21:11:51 2025 +0000

    feat: Increase grid size and add bonus
    
    Increase the game grid size to 5x5.
    Add a bonus for clearing a 4x4 section in one placement.

[33mcommit 98178f4216ab023300cdb773a89dfb4d5972d4e4[m
Author: gpt-engineer-app[bot] <159125892+gpt-engineer-app[bot]@users.noreply.github.com>
Date:   Fri May 2 15:06:18 2025 +0000

    Fix: Update hold key in tutorial
    
    Updated the hold key instruction in the tutorial from 'H' to 'C'.

[33mcommit 16cb51e49307ffbc3e5abaac23e77e1a412b3956[m
Author: gpt-engineer-app[bot] <159125892+gpt-engineer-app[bot]@users.noreply.github.com>
Date:   Fri May 2 14:54:25 2025 +0000

    Revert: Empty cell background
    
    Reverts the change to use a transparent background for empty cells, restoring the original background color.

[33mcommit 983a6782e992d4d80d49ac353fbad7dacd48375d[m
Author: gpt-engineer-app[bot] <159125892+gpt-engineer-app[bot]@users.noreply.github.com>
Date:   Fri May 2 14:53:15 2025 +0000

    Fix: Use spacebar to drop pieces
    
    Use spacebar instead of enter to drop pieces.

[33mcommit 5ee1df5096affe03679cc4c09f417fc71e3b408b[m
Author: gpt-engineer-app[bot] <159125892+gpt-engineer-app[bot]@users.noreply.github.com>
Date:   Thu Apr 24 04:07:53 2025 +0000

    Fix: Game board and score animations
    
    - Fixed mouse hover issue.
    - Resolved bug on first game round after refresh.
    - Updated score animations to match cell colors.
    - Added black outlines to score numbers for better visibility.
    - Removed 0s from empty board cells.

[33mcommit faaa3777c942f64bfdfcade0798f9c91b15e6404[m
Author: gpt-engineer-app[bot] <159125892+gpt-engineer-app[bot]@users.noreply.github.com>
Date:   Thu Apr 24 03:59:35 2025 +0000

    Fix: Improve game board interaction
    
    - Change score animation color.
    - Improve mouse hover and placement on edges.

[33mcommit f87bf6768f25e529e6ac12ab89b51b3265b83a1c[m
Author: gpt-engineer-app[bot] <159125892+gpt-engineer-app[bot]@users.noreply.github.com>
Date:   Thu Apr 24 03:57:04 2025 +0000

    Fix game visuals and controls
    
    Improve score animations, remove game modes, and fix control instructions. Add restart functionality to game over modal.

[33mcommit 71ee2e4b17293be08bab759823a3013c00d90911[m
Author: gpt-engineer-app[bot] <159125892+gpt-engineer-app[bot]@users.noreply.github.com>
Date:   Thu Apr 24 03:53:06 2025 +0000

    Fix: Resolve const re-declaration errors
    
    Fixes multiple "cannot reassign to a variable declared with `const`" and "the name `...` is defined multiple times" errors in GridPopGame.tsx. Also fixes a re-declaration of timeRemaining.

[33mcommit 5b4e580f6130fed7fed64b3de818c61cbc144ded[m
Author: gpt-engineer-app[bot] <159125892+gpt-engineer-app[bot]@users.noreply.github.com>
Date:   Thu Apr 24 03:51:23 2025 +0000

    Add game mode and control customization
    
    Implement game mode selection, key binding customization, mouse controls, and visual enhancements. Fix hovering bug and add game over screen board view. Add best overall score display.

[33mcommit 46463db85f9354f2f3fcaf2f2ffb3396abec4993[m
Author: gpt-engineer-app[bot] <159125892+gpt-engineer-app[bot]@users.noreply.github.com>
Date:   Wed Apr 23 06:18:35 2025 +0000

    Fix: Improve mouse hover behavior
    
    Improve the mouse hover functionality to allow for more seamless movement across the entire grid.

[33mcommit a97e5dd6b2e1cb2e7164e9f4e34c9ad0b65c667e[m
Author: gpt-engineer-app[bot] <159125892+gpt-engineer-app[bot]@users.noreply.github.com>
Date:   Wed Apr 23 06:13:37 2025 +0000

    feat: Change grid size to 4x4
    
    Refactor grid size and related calculations.

[33mcommit cbd08a84126b3cba83cef1c25a8c19b8dbd19476[m
Author: gpt-engineer-app[bot] <159125892+gpt-engineer-app[bot]@users.noreply.github.com>
Date:   Wed Apr 23 06:07:23 2025 +0000

    Fix: Auto-place bug and timer adjustments
    
    - Fixed an issue where auto-placed pieces were not placed correctly.
    - Adjusted the initial timer to 10 seconds and decreased it by 0.5 seconds per level, with a minimum of 3 seconds.
    - Improved the visual appearance of the ghost piece.

[33mcommit 513481524a0bf1087af5dff0c5b635d84e3e34da[m
Author: gpt-engineer-app[bot] <159125892+gpt-engineer-app[bot]@users.noreply.github.com>
Date:   Wed Apr 23 05:32:01 2025 +0000

    Refactor: Implement row/column clearing logic
    
    - Implement new row/column clearing logic based on the provided JSON configuration.
    - Remove flashing numbers at value 4.
    - Update scoring and visual effects.

[33mcommit 4d5b41ec73988bd0c4ddcf02698c143aeece047e[m
Author: gpt-engineer-app[bot] <159125892+gpt-engineer-app[bot]@users.noreply.github.com>
Date:   Wed Apr 23 05:23:13 2025 +0000

    Fix: Resolve runtime error
    
    The error "Cannot read properties of undefined (reading 'NaN')" is resolved.

[33mcommit a6ec3a4e7f813549c9b3d695f937057b2fd6b862[m
Author: gpt-engineer-app[bot] <159125892+gpt-engineer-app[bot]@users.noreply.github.com>
Date:   Wed Apr 23 05:19:04 2025 +0000

    feat: Implement cell color based on value

[33mcommit f1136d5648872d2cbddd712372a4a9675ac33e33[m
Author: gpt-engineer-app[bot] <159125892+gpt-engineer-app[bot]@users.noreply.github.com>
Date:   Wed Apr 23 05:14:11 2025 +0000

    Fix: Implement grid cell visualization and keyboard controls
    
    - Added visual representation of grid cell values.
    - Implemented arrow key controls for piece movement.
    - Added Enter key functionality to place pieces.

[33mcommit 771c9a2ef60d622bb4059a704e019a4245578dd1[m
Author: gpt-engineer-app[bot] <159125892+gpt-engineer-app[bot]@users.noreply.github.com>
Date:   Wed Apr 23 05:09:13 2025 +0000

    Add game logic and features
    
    Implement core game mechanics, UI elements, and visual/audio effects for GridPop: Overload.

[33mcommit da96b540e1d1a973e9c1c3816c95886bdb8f3928[m
Author: gpt-engineer-app[bot] <159125892+gpt-engineer-app[bot]@users.noreply.github.com>
Date:   Wed Apr 23 04:58:28 2025 +0000

    Use tech stack vite_react_shadcn_ts
