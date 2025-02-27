import type { Transaction, UnsafeTransaction, StorageDescriptor, TxOptions, RuntimeDescriptor } from "polkadot-api";
import { Observable } from "rxjs";

export type ApiTx = UnsafeTransaction<unknown | any, string, string, any> 
  | Transaction<unknown | any, string, string, any>

export type ApiStorage = StorageDescriptor<any, any, boolean, string> & {
  getValue: (...args: unknown, options?: TxOptions) => Promise<any>,
  watchValue: (...args: unknown, options?: TxOptions) => Observable<any>,
}

export type ApiRuntimeCall = RuntimeDescriptor<any>
