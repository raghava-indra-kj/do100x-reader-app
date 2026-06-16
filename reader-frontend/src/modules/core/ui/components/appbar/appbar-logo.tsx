import { useNavigate } from 'react-router-dom';
import { homePageRoute } from '@boot/routes';

export function AppBarLogo() {
    const navigate = useNavigate();
    return (
        <div
            className="flex cursor-pointer items-center gap-2.5"
            onClick={() => navigate(homePageRoute)}
        >
            <img src="/logo.png" alt="" className="h-6 w-6" />
            <span className="font-[family-name:var(--font-serif)] text-base font-semibold text-[var(--color-text-strong)]">Reader</span>
        </div>
    );
}
