import { Injectable } from '@angular/core'
import { Action } from '@ngrx/store'
import { Actions, Effect, ofType } from '@ngrx/effects'
import { defer, Observable, of } from 'rxjs'
import { catchError, map, switchMap, switchMapTo } from 'rxjs/operators'

import { MonzoService } from '../../services/monzo.service'
import {
  accountsRequest,
  Account,
  MonzoAccountsResponse
} from '../../../lib/monzo/Account'
import { MonzoBalanceResponse } from '../../../lib/monzo/Amount'

import {
  GET_BALANCE,
  SetBalanceAction,
  GetBalanceAction,
  GetBalanceFailedAction
} from '../actions/balance.actions'

@Injectable()
export class BalanceEffects {
  constructor(
    private readonly actions$: Actions,
    private readonly monzoService: MonzoService
  ) {}

  @Effect()
  get$: Observable<Action> = this.actions$.pipe(
    ofType(GET_BALANCE),
    switchMapTo(
      this.monzoService.request<MonzoAccountsResponse>(accountsRequest())
    ),
    switchMap(accounts => {
      const account = new Account(accounts.accounts[0])

      return this.monzoService.request<MonzoBalanceResponse>(
        account.balanceRequest()
      )
    }),
    map(data => new SetBalanceAction(data)),
    catchError(err => {
      console.error(err)
      return of(new GetBalanceFailedAction())
    })
  )

  @Effect()
  init$: Observable<Action> = this.actions$.pipe(
    ofType('@monux/init'),
    switchMapTo(defer(() => of(new GetBalanceAction())))
  )
}