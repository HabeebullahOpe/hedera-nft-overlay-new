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
      
      // Enhanced Canvas setup with desktop rotation and resizing
      console.log('Setting up canvas listeners');
      const canvas = document.getElementById('nft-canvas');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        let isDragging = false;
        let isPinching = false;
        let isRotating = false;
        let isRotatingWithKey = false;
        let isResizingWithKey = false;
        let overlayX = 100, overlayY = 100;
        let overlayWidth = 1000, overlayHeight = 1000;
        let scale = 1;
        let rotation = 0;
        let dragOffsetX = 0, dragOffsetY = 0;
        let lastTouchDistance = 0;
        let lastAngle = 0;
        let touch1, touch2;
        let rotateStartX = 0, rotateStartY = 0;
        let resizeStartX = 0, resizeStartY = 0;
        let initialWidth = 0, initialHeight = 0;

        function getCanvasScale() {
          return {
            scaleX: canvas.width / canvas.clientWidth,
            scaleY: canvas.height / canvas.clientHeight
          };
        }

        function getTouchPosition(touch, rect, scaleX, scaleY) {
          return {
            x: (touch.clientX - rect.left) * scaleX,
            y: (touch.clientY - rect.top) * scaleY
          };
        }

        function isOverOverlay(x, y) {
          // Improved hit detection for rotated elements
          const halfWidth = (overlayWidth * scale) / 2;
          const halfHeight = (overlayHeight * scale) / 2;
          const centerX = overlayX + halfWidth;
          const centerY = overlayY + halfHeight;
          
          // Transform point to overlay's local coordinates
          const dx = x - centerX;
          const dy = y - centerY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) - (rotation * Math.PI / 180);
          
          // Check if point is within bounds
          const localX = distance * Math.cos(angle);
          const localY = distance * Math.sin(angle);
          
          return Math.abs(localX) <= halfWidth && Math.abs(localY) <= halfHeight;
        }

        function isOverResizeHandle(x, y) {
          // Check if cursor is near the bottom-right corner (for resize)
          const halfWidth = (overlayWidth * scale) / 2;
          const halfHeight = (overlayHeight * scale) / 2;
          const centerX = overlayX + halfWidth;
          const centerY = overlayY + halfHeight;
          
          // Transform point to overlay's local coordinates
          const dx = x - centerX;
          const dy = y - centerY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) - (rotation * Math.PI / 180);
          
          // Check if point is near the corner
          const localX = distance * Math.cos(angle);
          const localY = distance * Math.sin(angle);
          
          const handleSize = 30;
          return localX > halfWidth - handleSize && localY > halfHeight - handleSize;
        }

        function isOverRotateHandle(x, y) {
          // Check if cursor is near the top-center (for rotation)
          const halfWidth = (overlayWidth * scale) / 2;
          const halfHeight = (overlayHeight * scale) / 2;
          const centerX = overlayX + halfWidth;
          const centerY = overlayY + halfHeight;
          
          // Transform point to overlay's local coordinates
          const dx = x - centerX;
          const dy = y - centerY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) - (rotation * Math.PI / 180);
          
          // Check if point is near the top center
          const localX = distance * Math.cos(angle);
          const localY = distance * Math.sin(angle);
          
          const handleSize = 30;
          return Math.abs(localX) < handleSize && localY < -halfHeight + handleSize;
        }

        // Mouse events for desktop
        canvas.addEventListener('mousedown', (e) => {
          e.preventDefault();
          const rect = canvas.getBoundingClientRect();
          const { scaleX, scaleY } = getCanvasScale();
          const mouseX = (e.clientX - rect.left) * scaleX;
          const mouseY = (e.clientY - rect.top) * scaleY;

          if (isOverRotateHandle(mouseX, mouseY) && e.shiftKey) {
            // Start rotation
            isRotatingWithKey = true;
            rotateStartX = mouseX;
            rotateStartY = mouseY;
            canvas.style.cursor = 'grab';
          } else if (isOverResizeHandle(mouseX, mouseY) && e.ctrlKey) {
            // Start resizing
            isResizingWithKey = true;
            resizeStartX = mouseX;
            resizeStartY = mouseY;
            initialWidth = overlayWidth * scale;
            initialHeight = overlayHeight * scale;
            canvas.style.cursor = 'nwse-resize';
          } else if (isOverOverlay(mouseX, mouseY)) {
            // Start dragging
            isDragging = true;
            dragOffsetX = mouseX - overlayX;
            dragOffsetY = mouseY - overlayY;
            canvas.style.cursor = 'move';
          }
        });

        document.addEventListener('mousemove', (e) => {
          const rect = canvas.getBoundingClientRect();
          const { scaleX, scaleY } = getCanvasScale();
          const mouseX = (e.clientX - rect.left) * scaleX;
          const mouseY = (e.clientY - rect.top) * scaleY;

          // Update cursor style
          if (isOverRotateHandle(mouseX, mouseY) && e.shiftKey) {
            canvas.style.cursor = 'grab';
          } else if (isOverResizeHandle(mouseX, mouseY) && e.ctrlKey) {
            canvas.style.cursor = 'nwse-resize';
          } else if (isOverOverlay(mouseX, mouseY)) {
            canvas.style.cursor = 'move';
          } else {
            canvas.style.cursor = 'default';
          }

          if (isDragging) {
            e.preventDefault();
            overlayX = mouseX - dragOffsetX;
            overlayY = mouseY - dragOffsetY;
            drawCanvas();
          } else if (isRotatingWithKey) {
            e.preventDefault();
            // Calculate rotation based on mouse movement
            const centerX = overlayX + (overlayWidth * scale) / 2;
            const centerY = overlayY + (overlayHeight * scale) / 2;
            
            const angle1 = Math.atan2(rotateStartY - centerY, rotateStartX - centerX);
            const angle2 = Math.atan2(mouseY - centerY, mouseX - centerX);
            rotation += (angle2 - angle1) * (180 / Math.PI);
            
            rotateStartX = mouseX;
            rotateStartY = mouseY;
            drawCanvas();
          } else if (isResizingWithKey) {
            e.preventDefault();
            // Calculate scale based on mouse movement
            const dx = mouseX - resizeStartX;
            const dy = mouseY - resizeStartY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Adjust scale based on movement
            const scaleFactor = 1 + (distance / 100);
            scale = Math.max(0.1, Math.min(scale * scaleFactor, 5));
            
            resizeStartX = mouseX;
            resizeStartY = mouseY;
            drawCanvas();
          }
        });

        document.addEventListener('mouseup', () => {
          isDragging = false;
          isRotatingWithKey = false;
          isResizingWithKey = false;
          canvas.style.cursor = 'default';
        });

        // Keyboard shortcuts for rotation and scaling
        document.addEventListener('keydown', (e) => {
          if (e.key === 'r' || e.key === 'R') {
            // Reset transformations
            scale = 1;
            rotation = 0;
            drawCanvas();
          }
        });

        // Touch events (remain unchanged from your original implementation)
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

        window.drawCanvas = function() {
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
                
                // Draw resize and rotate handles (only when overlay is selected)
                if (selectedNFT) {
                  ctx.fillStyle = '#00ff40';
                  
                  // Resize handle (bottom-right corner)
                  ctx.beginPath();
                  ctx.arc(
                    (overlayWidth * scale) / 2 - 10,
                    (overlayHeight * scale) / 2 - 10,
                    8, 0, Math.PI * 2
                  );
                  ctx.fill();
                  
                  // Rotate handle (top-center)
                  ctx.beginPath();
                  ctx.arc(
                    0,
                    -(overlayHeight * scale) / 2 + 10,
                    8, 0, Math.PI * 2
                  );
                  ctx.fill();
                }
                
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
  
  // Handle new session
  function handleNewSession(session) {
    console.log('Handling new session');
    const account = session.namespaces?.hedera?.accounts?.[0];
    if (!account) {
      console.error('No account found');
      return;
    }
    
    const accountId = account.split(':').pop();
    localStorage.setItem('hederaAccountId', accountId);
    const walletStatus = document.getElementById('wallet-status');
    if (walletStatus) {
      walletStatus.textContent = `Connected: ${accountId}`;
    } else {
      console.error('wallet-status element not found');
    }
    const connectButton = document.getElementById('connect-wallet');
    const disconnectButton = document.getElementById('disconnect-wallet');
    if (connectButton) connectButton.style.display = 'none';
    if (disconnectButton) disconnectButton.style.display = 'block';
    
    fetchNFTs(accountId);
  }
  
  // Disconnect
  async function disconnectWallet() {
    console.log('Disconnecting wallet');
    try {
      if (dAppConnector) {
        await dAppConnector.disconnect();
        dAppConnector = null;
        const walletStatus = document.getElementById('wallet-status');
        if (walletStatus) walletStatus.textContent = 'Wallet not connected';
        const connectButton = document.getElementById('connect-wallet');
        const disconnectButton = document.getElementById('disconnect-wallet');
        if (connectButton) connectButton.style.display = 'block';
        if (disconnectButton) disconnectButton.style.display = 'none';
        const nftList = document.getElementById('nft-list');
        if (nftList) nftList.innerHTML = '<p class="nft-placeholder">Connect wallet to see NFTs</p>';
      }
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  }
  
  // Fetch NFTs using Mirror Node REST API
  async function fetchNFTs(accountId) {
    console.log('Fetching NFTs for account:', accountId);
    try {
      const response = await fetch(`https://mainnet.mirrornode.hedera.com/api/v1/accounts/${accountId}/nfts`);
      const data = await response.json();
      const nfts = data.nfts || [];
      const nftList = document.getElementById('nft-list');
      if (nftList) {
        nftList.innerHTML = await Promise.all(nfts.map(async nft => {
          let imageUrl = 'https://via.placeholder.com/150';
          if (nft.metadata) {
            // Decode the base64 metadata
            const metadataStr = atob(nft.metadata);
            console.log(`Decoded metadata for NFT ${nft.serial_number}:`, metadataStr);
            // Check if metadataStr is an IPFS URL
            if (metadataStr.startsWith('ipfs://')) {
              const ipfsHash = metadataStr.replace('ipfs://', '');
              const metadataUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
              console.log(`Fetching metadata from: ${metadataUrl}`);
              try {
                // Fetch the metadata JSON from the IPFS URL
                const metadataResponse = await fetch(metadataUrl);
                const metadata = await metadataResponse.json();
                console.log(`Metadata for NFT ${nft.serial_number}:`, metadata);
                if (metadata.image) {
                  // Handle the image URL from the metadata
                  if (metadata.image.startsWith('ipfs://')) {
                    const imageHash = metadata.image.replace('ipfs://', '');
                    imageUrl = `https://ipfs.io/ipfs/${imageHash}`;
                  } else {
                    imageUrl = metadata.image;
                  }
                  console.log(`Final image URL for NFT ${nft.serial_number}:`, imageUrl);
                }
              } catch (e) {
                console.error(`Error fetching metadata from IPFS for NFT ${nft.serial_number}:`, e);
              }
            } else {
              // If metadataStr isn't an IPFS URL, try parsing it as JSON
              try {
                const metadata = JSON.parse(metadataStr);
                console.log(`Metadata for NFT ${nft.serial_number}:`, metadata);
                if (metadata.image) {
                  if (metadata.image.startsWith('ipfs://')) {
                    const imageHash = metadata.image.replace('ipfs://', '');
                    imageUrl = `https://ipfs.io/ipfs/${imageHash}`;
                  } else {
                    imageUrl = metadata.image;
                  }
                  console.log(`Final image URL for NFT ${nft.serial_number}:`, imageUrl);
                }
              } catch (e) {
                console.error(`Metadata parse error for NFT ${nft.serial_number}:`, e);
              }
            }
          }
          return `
            <div class="nft-item" data-serial="${nft.serial_number}">
              <img src="${imageUrl}" alt="NFT" onclick="selectNFT(this)">
              <p>Serial: ${nft.serial_number}</p>
            </div>
          `;
        })).then(results => results.join(''));
      }
    } catch (error) {
      console.error('NFT fetch error:', error);
      const nftList = document.getElementById('nft-list');
      if (nftList) nftList.innerHTML = '<p class="nft-placeholder">Error fetching NFTs</p>';
    }
  }
  
  // Select NFT for overlay
  let selectedNFT = null;
  window.selectNFT = function(img) {
    selectedNFT = img.src;
    document.querySelectorAll('.nft-item').forEach(item => item.classList.remove('selected'));
    img.parentElement.classList.add('selected');
    const canvasPlaceholder = document.getElementById('nft-display')?.querySelector('.canvas-placeholder');
    if (canvasPlaceholder) canvasPlaceholder.style.display = 'none';
    drawCanvas();
  };
  
  // Start WalletConnect initialization
  initializeWalletConnect();
});