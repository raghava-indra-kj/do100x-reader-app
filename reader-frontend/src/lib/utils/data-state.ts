import type { AppError } from "@core/errors/app-error";
import { generateInstanceId } from "@lib/utils/instance-id";

export const DataStatus = {
    INIT: 'INIT',
    LOADING: 'LOADING',
    LOADED: 'LOADED',
    ERROR: 'ERROR',
} as const;

export type DataStatus = (typeof DataStatus)[keyof typeof DataStatus];

export class DataState<Data> {
    readonly instanceId: string = generateInstanceId({});
    private readonly stateValue: DataStatus;
    private readonly dataValue: Data | null;
    private readonly errorValue: AppError | null;

    private constructor(stateValue: DataStatus, dataValue: Data | null = null, errorValue: AppError | null = null) {
        this.stateValue = stateValue;
        this.dataValue = dataValue;
        this.errorValue = errorValue;
    }

    static init<Data>(): DataState<Data> {
        return new DataState<Data>(DataStatus.INIT);
    }

    static loading<Data>(): DataState<Data> {
        return new DataState<Data>(DataStatus.LOADING);
    }

    static data<Data>(data: Data): DataState<Data> {
        return new DataState<Data>(DataStatus.LOADED, data);
    }

    static error<Data>(error: AppError): DataState<Data> {
        return new DataState<Data>(DataStatus.ERROR, null, error);
    }

    get isPending(): boolean {
        return this.stateValue === DataStatus.INIT || this.stateValue === DataStatus.LOADING;
    }

    get isInit(): boolean {
        return this.stateValue === DataStatus.INIT;
    }

    get isLoading(): boolean {
        return this.stateValue === DataStatus.LOADING;
    }

    get isLoaded(): boolean {
        return this.stateValue === DataStatus.LOADED;
    }

    get isSuccess(): boolean {
        return this.stateValue === DataStatus.LOADED;
    }

    get isError(): boolean {
        return this.stateValue === DataStatus.ERROR;
    }

    get value(): Data {
        return this.dataValue!;
    }

    get error(): AppError {
        return this.errorValue!;
    }

    get state(): DataStatus {
        return this.stateValue;
    }

    getErrorOrThrow(): AppError {
        if (!this.isError) {
            throw new Error('DataState is not in error state');
        }
        return this.errorValue!;
    }

    match<T>(handlers: {
        init: () => T;
        loading: () => T;
        loaded: (data: Data) => T;
        error: (error: AppError) => T;
    }): T {
        switch (this.stateValue) {
            case DataStatus.INIT:
                return handlers.init();
            case DataStatus.LOADING:
                return handlers.loading();
            case DataStatus.LOADED:
                return handlers.loaded(this.dataValue as Data);
            case DataStatus.ERROR:
                return handlers.error(this.errorValue as AppError);
            default:
                throw new Error('Unhandled state in DataState.match()');
        }
    }

    fold<T>(handlers: {
        pending: () => T;
        loaded: (data: Data) => T;
        error: (error: AppError) => T;
    }): T {
        switch (this.stateValue) {
            case DataStatus.INIT:
            case DataStatus.LOADING:
                return handlers.pending();
            case DataStatus.LOADED:
                return handlers.loaded(this.dataValue as Data);
            case DataStatus.ERROR:
                return handlers.error(this.errorValue as AppError);
            default:
                throw new Error('Unhandled state in DataState.fold()');
        }
    }

    ifLoadedOr<T>(handlers: {
        loaded: (data: Data) => T;
        or: () => T;
    }): T {
        switch (this.stateValue) {
            case DataStatus.LOADED:
                return handlers.loaded(this.dataValue as Data);
            case DataStatus.INIT:
            case DataStatus.LOADING:
            case DataStatus.ERROR:
                return handlers.or();
            default:
                throw new Error('Unhandled state in DataState.ifLoadedOr()');
        }
    }
}
