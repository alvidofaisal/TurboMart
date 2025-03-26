// Service worker registration helper

export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then(registration => {
          console.log('SW registered:', registration);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content is available, show update notification
                  if (window.confirm('A new version of TurboMart is available. Load new version?')) {
                    window.location.reload();
                  }
                }
              });
            }
          });
        })
        .catch(error => {
          console.error('SW registration failed:', error);
        });
      
      // Handle communication from service worker
      navigator.serviceWorker.addEventListener('message', event => {
        const data = event.data;
        
        if (data && data.type === 'SYNC_COMPLETED') {
          console.log(`Background sync completed: ${data.tag}`);
          // Notify the application that sync is complete
          if (data.tag === 'sync-cart') {
            // Update UI to show cart is synced
            const event = new CustomEvent('cart-synced');
            window.dispatchEvent(event);
          }
        }
      });
    });
  }
}

export function unregisterServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then(registration => {
        registration.unregister();
      })
      .catch(error => {
        console.error(error.message);
      });
  }
}

// Check if the app is online
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
    ? navigator.onLine
    : true;
}

// Listen for online/offline events
export function setupOnlineListeners(
  onOnline: () => void,
  onOffline: () => void
) {
  if (typeof window !== 'undefined') {
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }
  
  return () => {};
}

// Register for background sync
export async function registerBackgroundSync(tag: string): Promise<boolean> {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register(tag);
      return true;
    } catch (error) {
      console.error('Background sync registration failed:', error);
      return false;
    }
  }
  return false;
} 