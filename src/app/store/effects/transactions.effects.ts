import { Injectable } from '@angular/core'
import { Actions, Effect, ofType } from '@ngrx/effects'
import { Action, Store } from '@ngrx/store'
import { startOfMonth, subMonths } from 'date-fns'
import { forkJoin, Observable, of } from 'rxjs'
import { catchError, map, switchMap, tap, withLatestFrom } from 'rxjs/operators'
import Debug = require('debug')

import { AppState } from '../'
import {
  Account,
  accountsRequest,
  MonzoAccountsResponse
} from '../../../lib/monzo/Account'
import {
  MonzoTransactionOuterResponse,
  MonzoTransactionsResponse,
  Transaction
} from '../../../lib/monzo/Transaction'
import { MonzoService } from '../../services/monzo.service'
import {
  SELECT_TRANSACTION,
  SelectTransactionAction
} from '../actions/selectedTransaction.actions'
import {
  GET_TRANSACTIONS,
  GetTransactionsAction,
  GetTransactionsFailedAction,
  PATCH_TRANSACTION_NOTES,
  PatchTransactionNotesAction,
  PatchTransactionNotesFailedAction,
  SetTransactionAction,
  SetTransactionsAction
} from '../actions/transactions.actions'

const debug = Debug('app:effects:transactions')

@Injectable()
export class TransactionsEffects {
  constructor(
    private store$: Store<AppState>,
    private actions$: Actions,
    private monzo: MonzoService
  ) {}

  @Effect()
  getTransactions$: Observable<Action> = this.actions$.pipe(
    ofType(GET_TRANSACTIONS),
    switchMap(action => {
      return forkJoin(
        of(action),
        this.monzo.request<MonzoAccountsResponse>(accountsRequest())
      )
    }),
    switchMap(
      ([action, accounts]: [GetTransactionsAction, MonzoAccountsResponse]) => {
        const account = new Account(accounts.accounts[0])

        return this.monzo.request<MonzoTransactionsResponse>(
          account.transactionsRequest(action.payload)
        )
      }
    ),
    map(txs => new SetTransactionsAction(txs.transactions)),
    catchError(err => {
      console.error(err)
      return of(new GetTransactionsFailedAction())
    })
  )

  @Effect()
  patchNote$: Observable<Action> = this.actions$.pipe(
    ofType(PATCH_TRANSACTION_NOTES),
    switchMap(({ tx, notes }: PatchTransactionNotesAction) =>
      this.monzo.request<MonzoTransactionOuterResponse>(
        tx.setNotesRequest(notes)
      )
    ),
    switchMap(({ transaction: tx }) =>
      // TODO: remove extraneous api call
      this.monzo.request<MonzoTransactionOuterResponse>(
        new Transaction(tx).selfRequest()
      )
    ),
    map(({ transaction: tx }) => new SetTransactionAction(tx)),
    catchError(err => {
      console.error(err)
      return of(new PatchTransactionNotesFailedAction())
    })
  )

  @Effect({ dispatch: false })
  logSelectTx$: Observable<any> = this.actions$.pipe(
    ofType(SELECT_TRANSACTION),
    withLatestFrom(this.store$),
    tap(([action, store]: [SelectTransactionAction, AppState]) => {
      const selTxId = action.payload
      if (!selTxId) return

      const tx = store.transactions.find(tx => tx.id === selTxId)
      debug('selected tx =>', tx || 'no tx found')
    })
  )

  @Effect()
  init$: Observable<Action> = this.actions$.pipe(
    ofType('@monux/init'),
    switchMap(() => {
      // const startDate = subMonths(startOfMonth(Date.now()), 1)
      const startDate = subMonths(startOfMonth(Date.now()), 0)

      return of(
        new GetTransactionsAction({
          since: startDate
        })
      )
    })
  )
}