// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { KeyboardSensor, rectIntersection, type ClientRect, type DroppableContainer, type KeyboardSensorProps, type SensorContext } from '@dnd-kit/core';
import { matrixKeyboardCoordinates } from './matrix-drag';

const rect = (left: number, top: number, width: number, height: number): ClientRect => ({ left, top, width, height, right: left + width, bottom: top + height });
const mobileRects = [rect(12, -162.4, 366, 185), rect(12, 34.675, 366, 590.6), rect(12, 637.275, 366, 155.987), rect(12, 805.262, 366, 155.987)];

function contextFor(rectangles: ClientRect[], priority = 2): SensorContext {
    const droppableRects = new Map(rectangles.map((value, index) => [`priority-${index + 1}`, value]));
    const containers = rectangles.map((value, index): DroppableContainer => ({ id: `priority-${index + 1}`, key: `priority-${index + 1}`, data: { current: { priority: index + 1 } }, disabled: false, node: { current: null }, rect: { current: value } }));
    const droppableContainers = Object.assign(new Map(containers.map(value => [value.id, value])), {
        toArray: () => containers,
        getEnabled: () => containers.filter(value => !value.disabled),
        getNodeFor: () => undefined,
    });
    return {
        activatorEvent: null, active: { id: 'task', data: { current: { priority } }, rect: { current: { initial: null, translated: null } } },
        activeNode: null, collisionRect: rect(51, 539.375, 288, 77.1), collisions: null,
        draggableNodes: new Map(), draggingNode: null, draggingNodeRect: null,
        droppableRects, droppableContainers, scrollableAncestors: [], scrollAdjustedTranslate: null,
        over: { id: `priority-${priority}`, data: { current: { priority } }, disabled: false, rect: rectangles[priority - 1] },
    };
}

function move(context: SensorContext, code: string) {
    return matrixKeyboardCoordinates(new KeyboardEvent('keydown', { code, cancelable: true }), {
        active: 'task', currentCoordinates: { x: context.collisionRect!.left, y: context.collisionRect!.top }, context,
    });
}

afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ''; });

describe('priority matrix keyboard geometry', () => {
    it('targets the empty next group below a long mobile group, even after scrolling', () => {
        const scrolled = mobileRects.map(value => rect(value.left, value.top - 129.6, value.width, value.height));
        const context = contextFor(scrolled);
        const target = move(context, 'ArrowDown')!;
        const collision = rect(target.x, target.y, context.collisionRect!.width, context.collisionRect!.height);
        expect(rectIntersection({ active: context.active!, collisionRect: collision, droppableRects: context.droppableRects, droppableContainers: context.droppableContainers.getEnabled(), pointerCoordinates: null })[0]?.id).toBe('priority-3');
        expect(move(context, 'ArrowLeft')).toBeUndefined();
        expect(move(context, 'ArrowRight')).toBeUndefined();
    });

    it.each([
        [1, 'ArrowRight', 2], [1, 'ArrowDown', 3], [2, 'ArrowLeft', 1],
        [2, 'ArrowDown', 4], [4, 'ArrowUp', 2], [4, 'ArrowLeft', 3],
    ])('moves P%i %s to P%i in the desktop grid', (from, key, to) => {
        const rectangles = [rect(0, 0, 400, 300), rect(412, 0, 400, 300), rect(0, 312, 400, 300), rect(412, 312, 400, 300)];
        const context = contextFor(rectangles, from);
        const target = move(context, key)!;
        expect(target.x + context.collisionRect!.width / 2).toBe(rectangles[to - 1].left + rectangles[to - 1].width / 2);
        expect(target.y + context.collisionRect!.height / 2).toBe(rectangles[to - 1].top + rectangles[to - 1].height / 2);
    });

    it('lets one arrow reach each mobile group after the keyboard sensor finishes scrolling', () => {
        vi.useFakeTimers();
        const grid = document.createElement('div'); document.body.append(grid);
        Object.defineProperties(grid, { clientWidth: { value: 390 }, clientHeight: { value: 552 }, scrollWidth: { value: 390 }, scrollHeight: { value: 1600 } });
        grid.getBoundingClientRect = () => ({ ...rect(0, 292, 390, 552), x: 0, y: 292, toJSON: () => ({}) });
        const initialScroll = 459.2;
        grid.scrollTop = initialScroll;
        const context = { current: contextFor(mobileRects) };
        context.current.scrollableAncestors = [grid];
        function updateCollision() {
            const current = context.current;
            current.droppableRects = new Map(mobileRects.map((value, index) => [`priority-${index + 1}`, rect(value.left, value.top - (grid.scrollTop - initialScroll), value.width, value.height)]));
            const id = rectIntersection({ active: current.active!, collisionRect: current.collisionRect!, droppableRects: current.droppableRects, droppableContainers: current.droppableContainers.getEnabled(), pointerCoordinates: null })[0]?.id;
            current.over = id ? { id, data: { current: current.droppableContainers.get(id)!.data.current }, disabled: false, rect: current.droppableRects.get(id)! } : null;
        }
        // The real sensor can scroll instead of translating the overlay. Its
        // destination is only observable after the smooth scroll has settled.
        grid.scrollTo = vi.fn(options => {
            const top = (options as ScrollToOptions).top!;
            setTimeout(() => { grid.scrollTop = top; updateCollision(); }, 250);
        });
        grid.scrollBy = vi.fn(options => grid.scrollTo({ top: grid.scrollTop + (options as ScrollToOptions).top! }));
        const initialOverlay = context.current.collisionRect!;
        const onMove = vi.fn(({ x, y }) => {
            context.current.collisionRect = rect(initialOverlay.left + x, initialOverlay.top + y, initialOverlay.width, initialOverlay.height);
            updateCollision();
        });
        const props: KeyboardSensorProps = {
            active: 'task', activeNode: { id: 'task', key: 'task', node: { current: null }, activatorNode: { current: null }, data: { current: { priority: 2 } } },
            event: new KeyboardEvent('keydown', { code: 'Space' }), context,
            options: { coordinateGetter: matrixKeyboardCoordinates }, onMove,
            onStart: vi.fn(), onCancel: vi.fn(), onEnd: vi.fn(), onAbort: vi.fn(), onPending: vi.fn(),
        };
        new KeyboardSensor(props);
        vi.runAllTimers(); // Install the sensor's document key listener.
        for (const [key, expected] of [['ArrowDown', 3], ['ArrowDown', 4], ['ArrowUp', 3], ['ArrowUp', 2]] as const) {
            const previous = context.current.over!.id;
            document.dispatchEvent(new KeyboardEvent('keydown', { code: key, cancelable: true }));
            expect(context.current.over!.id).toBe(previous);
            vi.runAllTimers();
            expect(context.current.over!.id).toBe(`priority-${expected}`);
        }
        expect(grid.scrollTo).toHaveBeenCalledTimes(4);
        expect(onMove).not.toHaveBeenCalled();
        document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }));
        expect(props.onCancel).toHaveBeenCalledOnce();
    });
});
