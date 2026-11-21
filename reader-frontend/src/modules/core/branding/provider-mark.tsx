// Source: https://duckduckgo.com/assets/icons/meta/DDG-icon_64x64.png
import duckduckgoMark from './duckduckgo.png';
// Source: https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png
import googleMark from './google.png';

const marks = { google: googleMark, duckduckgo: duckduckgoMark };

export function ProviderMark({ provider }: { provider: keyof typeof marks }) {
    return <img src={marks[provider]} width={16} height={16} alt="" className="shrink-0" />;
}
