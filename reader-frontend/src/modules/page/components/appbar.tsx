import { usePageStore } from '../store';
import { AppBar, LogoutButton } from '@modules/core/ui/components/appbar';
import { Button } from '@modules/core/ui/primitives/button';
import { Minus, Plus } from 'lucide-react';
import { Observer } from 'mobx-react-lite';

export function PageAppbar() {
    const store = usePageStore();
    return (
        <AppBar
            right={
                <Observer>
                    {() => (
                        <>
                            <Button variant="outlined" size="sm" iconOnly onClick={() => store.decreaseFontSize()} disabled={!store.isFontSizeDecreasable} tooltip="Decrease font size">
                                <Minus size={16} />
                            </Button>
                            <Button variant="outlined" size="sm" iconOnly onClick={() => store.increaseFontSize()} disabled={!store.isFontSizeIncreasable} tooltip="Increase font size">
                                <Plus size={16} />
                            </Button>
                            <LogoutButton />
                        </>
                    )}
                </Observer>
            }
        />
    );
}
