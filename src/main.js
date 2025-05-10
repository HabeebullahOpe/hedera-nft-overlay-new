import { DAppConnector } from '@hashgraph/hedera-wallet-connect';
import { LedgerId } from '@hashgraph/sdk';

let dAppConnector;
let stage;
let nftLayer;
let overlayLayer;
let overlayImage;
let selectedNFTImage = null;
let selectedNFT = null;
let nftImgInstance = null;
let transformer = null;

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
      if (nftImgInstance) {
        fitNFTToCanvas();
      }
      stage.batchDraw();
    });

    if (placeholder) placeholder.style.display = 'none';
  }

  // Fit NFT to canvas with proper scaling
  function fitNFTToCanvas() {
    if (!nftImgInstance || !selectedNFTImage) return;

    const container = document.getElementById('nft-display');
    const img = new Image();
    img.src = selectedNFTImage;
    
    img.onload = () => {
      const containerRatio = container.clientWidth / container.clientHeight;
      const imageRatio = img.width / img.height;
      
      let newWidth, newHeight;
      
      if (imageRatio > containerRatio) {
        newWidth = container.clientWidth;
        newHeight = container.clientWidth / imageRatio;
      } else {
        newHeight = container.clientHeight;
        newWidth = container.clientHeight * imageRatio;
      }
      
      nftImgInstance.width(newWidth);
      nftImgInstance.height(newHeight);
      nftImgInstance.x((container.clientWidth - newWidth) / 2);
      nftImgInstance.y((container.clientHeight - newHeight) / 2);
      
      if (overlayImage) {
        positionOverlay();
      }
      
      stage.batchDraw();
    };
  }

  // Position overlay relative to NFT
  function positionOverlay() {
    if (!overlayImage || !nftImgInstance) return;
    
    overlayImage.position({
      x: nftImgInstance.x(),
      y: nftImgInstance.y()
    });
    
    overlayImage.width(nftImgInstance.width());
    overlayImage.height(nftImgInstance.height());
    
    if (transformer) {
      transformer.forceUpdate();
    }
    
    stage.batchDraw();
  }

  // Select NFT with proper scaling
  window.selectNFT = function(img) {
    selectedNFT = img.src;
    selectedNFTImage = img.src;
    const placeholder = document.querySelector('.canvas-placeholder');
    if (placeholder) placeholder.style.display = 'none';

    nftLayer.destroyChildren();

    const imageObj = new Image();
    imageObj.crossOrigin = 'Anonymous';
    imageObj.onload = function() {
      nftImgInstance = new Konva.Image({
        image: imageObj,
        width: imageObj.width,
        height: imageObj.height
      });
      
      nftLayer.add(nftImgInstance);
      fitNFTToCanvas();
      stage.batchDraw();
    };
    imageObj.src = img.src;
    
    document.querySelectorAll('.nft-item').forEach(item => {
      item.classList.remove('selected');
    });
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

  // Load overlay with proper scaling
  function loadOverlayImage(src) {
    if (!nftImgInstance) {
      alert('Please select an NFT first');
      return;
    }

    if (overlayImage) {
      overlayImage.destroy();
      overlayLayer.destroyChildren();
    }

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = function() {
      overlayImage = new Konva.Image({
        image: img,
        width: nftImgInstance.width(),
        height: nftImgInstance.height(),
        x: nftImgInstance.x(),
        y: nftImgInstance.y(),
        draggable: true
      });

      transformer = new Konva.Transformer({
        node: overlayImage,
        enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
        rotateEnabled: true,
        boundBoxFunc: (oldBox, newBox) => {
          return newBox.width < 30 || newBox.height < 30 ? oldBox : newBox;
        }
      });

      overlayLayer.add(overlayImage);
      overlayLayer.add(transformer);
      stage.batchDraw();
    };
    img.src = src;
  }

  // High-quality image export
  document.getElementById('apply-overlay').addEventListener('click', async () => {
    if (!selectedNFT) {
      alert('Select an NFT first!');
      return;
    }

    // Create a new stage with original image dimensions for crisp export
    const img = new Image();
    img.src = selectedNFT;
    
    await new Promise((resolve) => {
      img.onload = resolve;
    });

    const exportStage = new Konva.Stage({
      width: img.naturalWidth,
      height: img.naturalHeight
    });

    // Create layers for export
    const exportNftLayer = new Konva.Layer();
    const exportOverlayLayer = new Konva.Layer();

    // Add NFT image at original size
    const exportNftImage = new Konva.Image({
      image: img,
      width: img.naturalWidth,
      height: img.naturalHeight
    });
    exportNftLayer.add(exportNftImage);

    // Calculate overlay scale factor
    const scaleX = img.naturalWidth / nftImgInstance.width();
    const scaleY = img.naturalHeight / nftImgInstance.height();

    // Add overlay with proper scaling
    if (overlayImage) {
      const overlayImg = new Image();
      overlayImg.src = overlayImage.image().src;
      
      await new Promise((resolve) => {
        overlayImg.onload = resolve;
      });

      const exportOverlayImage = new Konva.Image({
        image: overlayImg,
        x: (overlayImage.x() - nftImgInstance.x()) * scaleX,
        y: (overlayImage.y() - nftImgInstance.y()) * scaleY,
        width: overlayImage.width() * scaleX,
        height: overlayImage.height() * scaleY,
        rotation: overlayImage.rotation(),
        scaleX: overlayImage.scaleX(),
        scaleY: overlayImage.scaleY()
      });
      exportOverlayLayer.add(exportOverlayImage);
    }

    exportStage.add(exportNftLayer);
    exportStage.add(exportOverlayLayer);

    // Export as high-quality PNG
    const dataURL = exportStage.toDataURL({
      mimeType: 'image/png',
      quality: 1,
      pixelRatio: 1 // Maintain original resolution
    });

    // Download
    const link = document.createElement('a');
    link.download = 'overlayed-nft.png';
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    exportStage.destroy();
  });

  // Wallet Connect Implementation (unchanged)
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
      
      dAppConnector = new DAppConnector(
        metadata,
        LedgerId.MAINNET,
        projectId,
        ['hedera_getAccountBalance', 'hedera_sign', 'hedera_signTransaction'],
        ['chainChanged', 'accountsChanged'],
        ['hedera:mainnet']
      );
      
      await dAppConnector.init({ logger: 'error' });
      
      const connectButton = document.getElementById('connect-wallet');
      if (connectButton) {
        connectButton.addEventListener('click', async () => {
          try {
            const session = await dAppConnector.openModal();
            handleNewSession(session);
          } catch (error) {
            console.error('Connection error:', error);
            const walletStatus = document.getElementById('wallet-status');
            if (walletStatus) walletStatus.textContent = 'Connection failed';
          }
        });
      }
      
      const disconnectButton = document.getElementById('disconnect-wallet');
      if (disconnectButton) {
        disconnectButton.addEventListener('click', disconnectWallet);
      }
      
    } catch (error) {
      console.error('Wallet init error:', error);
    }
  }

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
    }
    const connectButton = document.getElementById('connect-wallet');
    const disconnectButton = document.getElementById('disconnect-wallet');
    if (connectButton) connectButton.style.display = 'none';
    if (disconnectButton) disconnectButton.style.display = 'block';
    
    fetchNFTs(accountId);
  }
  
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
            const metadataStr = atob(nft.metadata);
            console.log(`Decoded metadata for NFT ${nft.serial_number}:`, metadataStr);
            if (metadataStr.startsWith('ipfs://')) {
              const ipfsHash = metadataStr.replace('ipfs://', '');
              const metadataUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
              console.log(`Fetching metadata from: ${metadataUrl}`);
              try {
                const metadataResponse = await fetch(metadataUrl);
                const metadata = await metadataResponse.json();
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
                console.error(`Error fetching metadata from IPFS for NFT ${nft.serial_number}:`, e);
              }
            } else {
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

  // Initialize everything
  initKonva();
  setupOverlayControls();
  initializeWalletConnect();
});
