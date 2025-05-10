import { DAppConnector } from '@hashgraph/hedera-wallet-connect';
import { LedgerId } from '@hashgraph/sdk';

let dAppConnector;

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded');

  // Initialize WalletConnect
  async function initializeWalletConnect() {
    console.log('Starting WalletConnect initialization');
    try {
      const projectId = '02e1bc316278f55430a587c11db76048';
      const metadata = {
        name: 'Overlayz',
        description: 'NFT Overlay Tool for Hedera',
        url: 'https://hedera-nft-overlay-new.vercel.app/',
        icons: ['/assets/icon/Overlayz_App_Icon.png'],
      };

      console.log('Creating DAppConnector instance');
      dAppConnector = new DAppConnector(
        metadata,
        LedgerId.MAINNET,
        projectId,
        ['hedera_getAccountBalance', 'hedera_sign', 'hedera_signTransaction'],
        ['chainChanged', 'accountsChanged'],
        ['hedera:mainnet']
      );

      console.log('Initializing DAppConnector');
      await dAppConnector.init({ logger: 'error' });
      console.log('WalletConnect initialized successfully');

      // Connect on button click
      console.log('Setting up connect-wallet button listener');
      const connectButton = document.getElementById('connect-wallet');
      if (connectButton) {
        console.log('connect-wallet button found');
        connectButton.addEventListener('click', async () => {
          console.log('Connect button clicked');
          try {
            const session = await dAppConnector.openModal();
            console.log('Session established:', session);
            handleNewSession(session);
          } catch (error) {
            console.error('Connection error:', error);
            const walletStatus = document.getElementById('wallet-status');
            if (walletStatus) walletStatus.textContent = 'Connection failed';
          }
        });
      }

      // Disconnect
      console.log('Setting up disconnect-wallet button listener');
      const disconnectButton = document.getElementById('disconnect-wallet');
      if (disconnectButton) {
        disconnectButton.addEventListener('click', disconnectWallet);
      }

      // Overlay upload
      console.log('Setting up overlay-upload listener');
      const overlayUpload = document.getElementById('overlay-upload');
      if (overlayUpload) {
        overlayUpload.addEventListener('change', (event) => {
          const file = event.target.files[0];
          if (file) {
            const overlayImg = document.getElementById('overlay-img');
            overlayImg.src = URL.createObjectURL(file);
            drawCanvas();
          }
        });
      }

      // Preset overlays
      console.log('Setting up overlay buttons');
      ['overlay1', 'overlay2', 'overlay3', 'overlay4', 'overlay5', 'overlay6', 'overlay7'].forEach((id, index) => {
        const button = document.getElementById(id);
        if (button) {
          button.addEventListener('click', () => {
            const overlayImg = document.getElementById('overlay-img');
            const overlays = [
              '/assets/arts/Good_Morning._Overlay.png',
              '/assets/arts/Mic.Overlay.png',
              '/assets/arts/Boombox.Overlay.png',
              '/assets/arts/Bonjour.Overlay.png',
              '/assets/arts/Sign.Overlay.png',
              '/assets/arts/Goodnight.Overlay.png',
              ''
            ];
            if (index < 6) {
              overlayImg.src = overlays[index];
              console.log(`Overlay button ${id} clicked, setting overlay to ${overlays[index]}`);
              drawCanvas();
            }
          });
        }
      });

      // Canvas setup with enhanced touch controls
      console.log('Setting up canvas listeners');
      const canvas = document.getElementById('nft-canvas');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        let isDragging = false;
        let isPinching = false;
        let isRotating = false;
        let overlayX = 0, overlayY = 0;
        let overlayWidth = 1000, overlayHeight = 1000;
        let scale = 1;
        let rotation = 0;
        let dragOffsetX = 0, dragOffsetY = 0;
        let lastTouchDistance = 0;
        let lastAngle = 0;
        let touch1, touch2;

        function getCanvasScale() {
          const scaleX = canvas.width / canvas.clientWidth;
          const scaleY = canvas.height / canvas.clientHeight;
          return { scaleX, scaleY };
        }

        function getTouchPosition(touch, rect, scaleX, scaleY) {
          return {
            x: (touch.clientX - rect.left) * scaleX,
            y: (touch.clientY - rect.top) * scaleY
          };
        }

        function isOverOverlay(x, y) {
          // Simplified hit detection - we'll improve this for rotated elements
          return x >= overlayX && x <= overlayX + overlayWidth * scale && 
                 y >= overlayY && y <= overlayY + overlayHeight * scale;
        }

        canvas.addEventListener('mousedown', (e) => {
          e.preventDefault();
          const rect = canvas.getBoundingClientRect();
          const { scaleX, scaleY } = getCanvasScale();
          const mouseX = (e.clientX - rect.left) * scaleX;
          const mouseY = (e.clientY - rect.top) * scaleY;

          if (isOverOverlay(mouseX, mouseY)) {
            isDragging = true;
            dragOffsetX = mouseX - overlayX;
            dragOffsetY = mouseY - overlayY;
          }
        });

        document.addEventListener('mousemove', (e) => {
          if (isDragging) {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const { scaleX, scaleY } = getCanvasScale();
            const mouseX = (e.clientX - rect.left) * scaleX;
            const mouseY = (e.clientY - rect.top) * scaleY;
            
            overlayX = mouseX - dragOffsetX;
            overlayY = mouseY - dragOffsetY;
            drawCanvas();
          }
        });

        document.addEventListener('mouseup', () => {
          isDragging = false;
        });

        canvas.addEventListener('touchstart', (e) => {
          e.preventDefault();
          const rect = canvas.getBoundingClientRect();
          const { scaleX, scaleY } = getCanvasScale();
          const touches = e.touches;
          
          if (touches.length === 1) {
            const touchPos = getTouchPosition(touches[0], rect, scaleX, scaleY);
            if (isOverOverlay(touchPos.x, touchPos.y)) {
              isDragging = true;
              dragOffsetX = touchPos.x - overlayX;
              dragOffsetY = touchPos.y - overlayY;
            }
          } else if (touches.length === 2) {
            isPinching = true;
            isRotating = true;
            touch1 = touches[0];
            touch2 = touches[1];
            
            // Calculate initial distance and angle
            const dx = touch1.clientX - touch2.clientX;
            const dy = touch1.clientY - touch2.clientY;
            lastTouchDistance = Math.sqrt(dx * dx + dy * dy);
            lastAngle = Math.atan2(dy, dx) * 180 / Math.PI;
          }
        });

        canvas.addEventListener('touchmove', (e) => {
          e.preventDefault();
          const rect = canvas.getBoundingClientRect();
          const { scaleX, scaleY } = getCanvasScale();
          const touches = e.touches;
          
          if (isDragging && touches.length === 1) {
            const touchPos = getTouchPosition(touches[0], rect, scaleX, scaleY);
            overlayX = touchPos.x - dragOffsetX;
            overlayY = touchPos.y - dragOffsetY;
            drawCanvas();
          } else if (isPinching && touches.length === 2) {
            touch1 = touches[0];
            touch2 = touches[1];
            
            // Calculate current distance and angle
            const dx = touch1.clientX - touch2.clientX;
            const dy = touch1.clientY - touch2.clientY;
            const currentDistance = Math.sqrt(dx * dx + dy * dy);
            const currentAngle = Math.atan2(dy, dx) * 180 / Math.PI;
            
            // Scale
            if (lastTouchDistance > 0) {
              const scaleFactor = currentDistance / lastTouchDistance;
              scale = Math.max(0.1, Math.min(scale * scaleFactor, 5));
              lastTouchDistance = currentDistance;
            }
            
            // Rotation
            if (isRotating) {
              const angleDiff = currentAngle - lastAngle;
              rotation += angleDiff;
              lastAngle = currentAngle;
            }
            
            drawCanvas();
          }
        });

        canvas.addEventListener('touchend', () => {
          isDragging = false;
          isPinching = false;
          isRotating = false;
        });

        window.drawCanvas = function () {
          if (!selectedNFT) {
            console.log('No NFT selected for canvas');
            return;
          }
          
          const nftImg = new Image();
          const overlayImg = document.getElementById('overlay-img');
          nftImg.src = selectedNFT;
          nftImg.crossOrigin = 'Anonymous';
          
          nftImg.onload = () => {
            canvas.width = nftImg.width;
            canvas.height = nftImg.height;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw NFT
            ctx.drawImage(nftImg, 0, 0);
            
            // Draw overlay with transformations
            if (overlayImg.src && overlayImg.src !== window.location.href) {
              const overlay = new Image();
              overlay.crossOrigin = 'Anonymous';
              overlay.src = overlayImg.src;
              
              overlay.onload = () => {
                // Save the current context
                ctx.save();
                
                // Move to the center of the overlay
                ctx.translate(overlayX + (overlayWidth * scale) / 2, overlayY + (overlayHeight * scale) / 2);
                
                // Apply rotation
                ctx.rotate(rotation * Math.PI / 180);
                
                // Draw the overlay
                ctx.drawImage(
                  overlay,
                  -(overlayWidth * scale) / 2,
                  -(overlayHeight * scale) / 2,
                  overlayWidth * scale,
                  overlayHeight * scale
                );
                
                // Restore the context
                ctx.restore();
              };
            }
          };
        };

        // Apply overlay
        const applyButton = document.getElementById('apply-overlay');
        if (applyButton) {
          applyButton.addEventListener('click', () => {
            if (selectedNFT) {
              const link = document.createElement('a');
              link.href = canvas.toDataURL();
              link.download = 'overlayed-nft.png';
              link.click();
            } else {
              alert('Select an NFT first!');
            }
          });
        }
      }
    } catch (error) {
      console.error('Wallet init error:', error);
    }
  }

  // Rest of your existing functions (handleNewSession, disconnectWallet, fetchNFTs, selectNFT)
  // ... [Keep all these functions exactly as they are in your original code]

  // Start WalletConnect initialization
  initializeWalletConnect();
});