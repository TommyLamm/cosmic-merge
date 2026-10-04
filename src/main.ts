import { GameApp } from './GameApp';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element #game-canvas not found');
    return;
  }

  // 鎖定手機觸控原生滑動與縮放
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('gesturechange', (e) => e.preventDefault());

  const app = new GameApp(canvas);
  app.start();

  console.log('Cosmic Merge (星體融合) initialized successfully.');
});
