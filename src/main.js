import { DAppConnector } from '@hashgraph/hedera-wallet-connect';
import { LedgerId } from '@hashgraph/sdk';

let dAppConnector;
let stage;
let nftLayer;
let overlayLayer;
let overlayImage;
let selectedNFTImage = null;
let selectedNFT = null;

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Konva Stage
  function initKonva() {
    const container = document.getElementById('nft-display');
    const placeholder = container.querySelector('.canvas-placeholder');
    
    stage = new Konva.Stage({
      container: 'nft-display',
      width: container.clientWidth,
      height: container.clientHeight
    });

    // Create layers
    nftLayer = new Konva.Layer();
    overlayLayer = new Konva.Layer();
    stage.add(nftLayer);
    stage.add(overlayLayer);

    // Handle window resize
    window.addEventListener('resize', () => {
      stage.width(container.clientWidth);
      stage.height(container.clientHeight);
      stage.batchDraw();
    });

    // Hide placeholder when canvas is initialized
    if (placeholder) placeholder.style.display = 'none';
  }

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
  window.selectNFT = function(img) {
    selectedNFT = img.src;
    selectedNFTImage = img;
    const container = document.getElementById('nft-display');
    const placeholder = container.querySelector('.canvas-placeholder');
    if (placeholder) placeholder.style.display = 'none';

    // Clear previous NFT image
    nftLayer.destroyChildren();

    // Load new NFT image
    const imageObj = new Image();
    imageObj.crossOrigin = 'Anonymous';
    imageObj.onload = function() {
      // Set stage size to match NFT image
      stage.width(imageObj.width);
      stage.height(imageObj.height);
      
      const nftImg = new Konva.Image({
        image: imageObj,
        width: imageObj.width,
        height: imageObj.height
      });
      
      nftLayer.add(nftImg);
      stage.batchDraw();
    };
    imageObj.src = img.src;
    document.querySelectorAll('.nft-item').forEach(item => item.classList.remove('selected'));
    img.parentElement.classList.add('selected');
  };

  // Handle overlay selection/upload
  function setupOverlayControls() {
    // Preset overlays
    ['overlay1', 'overlay2', 'overlay3', 'overlay4', 'overlay5', 'overlay6', 'overlay7'].forEach((id, index) => {
      const button = document.getElementById(id);
      if (button) {
        button.addEventListener('click', () => {
          const overlays = [
            '/assets/arts/Good_Morning._Overlay.png',
            '/assets/arts/Mic.Overlay.png',
            '/assets/arts/Boombox.Overlay.png',
            '/assets/arts/Bonjour.Overlay.png',
            '/assets/arts/Sign.Overlay.png',
            '/assets/arts/Goodnight.Overlay.png',
            '/assets/arts/Coffee.Overlay.png'
          ];
          
          if (index < 7) {
            loadOverlayImage(overlays[index]);
          }
        });
      }
    });

    // Overlay upload
    const overlayUpload = document.getElementById('overlay-upload');
    if (overlayUpload) {
      overlayUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
          const url = URL.createObjectURL(file);
          loadOverlayImage(url);
        }
      });
    }
  }

  // Load overlay image with transform controls
  function loadOverlayImage(src) {
    // Remove previous overlay if exists
    if (overlayImage) {
      overlayImage.destroy();
      overlayLayer.destroyChildren();
    }

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = function() {
      overlayImage = new Konva.Image({
        image: img,
        width: img.width,
        height: img.height,
        draggable: true,
        x: stage.width() / 2 - img.width / 2,
        y: stage.height() / 2 - img.height / 2
      });

      // Add transformer for resize/rotate
      const tr = new Konva.Transformer({
        node: overlayImage,
        enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
        rotateEnabled: true,
        boundBoxFunc: function(oldBox, newBox) {
          // Limit minimum size
          if (newBox.width < 30 || newBox.height < 30) {
            return oldBox;
          }
          return newBox;
        }
      });

      overlayLayer.add(overlayImage);
      overlayLayer.add(tr);
      stage.batchDraw();
    };
    img.src = src;
  }

  // Apply overlay (download)
  document.getElementById('apply-overlay').addEventListener('click', () => {
    if (!selectedNFT) {
      alert('Select an NFT first!');
      return;
    }

    // Create temporary stage for export
    const exportStage = new Konva.Stage({
      width: stage.width(),
      height: stage.height()
    });

    // Clone layers
    const exportNftLayer = nftLayer.clone();
    const exportOverlayLayer = overlayLayer.clone();
    
    exportStage.add(exportNftLayer);
    exportStage.add(exportOverlayLayer);

    // Export as image
    const dataURL = exportStage.toDataURL({
      mimeType: 'image/png',
      quality: 1,
      pixelRatio: 2 // Higher quality
    });

    // Download
    const link = document.createElement('a');
    link.download = 'overlayed-nft.png';
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    exportStage.destroy();
  });

  // Initialize everything
  initKonva();
  setupOverlayControls();
  initializeWalletConnect();
});