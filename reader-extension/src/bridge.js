const ORIGIN = __READER_ORIGIN__;
if (window.top === window && location.origin === ORIGIN) {
    window.addEventListener('message', async event => {
        if (event.source !== window || event.origin !== ORIGIN || location.pathname !== '/reader/capture') return;
        const key = new URLSearchParams(location.hash.slice(1)).get('capture');
        if (!key || event.data?.captureKey !== key) return;
        try {
            if (event.data.type === 'do100x.capture.request') {
                const response = await chrome.runtime.sendMessage({ type: 'capture.retrieve', captureKey: key });
                if (response?.ok) window.postMessage({ type: 'do100x.capture.payload', captureKey: key, payload: response.payload }, ORIGIN);
            } else if (event.data.type === 'do100x.capture.saved') {
                const response = await chrome.runtime.sendMessage({ type: 'capture.ack', captureKey: key });
                if (response?.ok) window.postMessage({ type: 'do100x.capture.acknowledged', captureKey: key }, ORIGIN);
            }
        } catch { /* The app shows a retry action if the extension was disabled. */ }
    });
}
