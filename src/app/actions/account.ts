import { createAction } from 'redux-actions'

import { EActions } from './index'
import { MonzoAccountResponse } from '../../lib/monzo/Account'

export interface ISetAccountPayload {
  bank: string
  acc: MonzoAccountResponse
}

export const setAccount = createAction<
  ISetAccountPayload,
  string,
  MonzoAccountResponse
>(EActions.SET_ACCOUNT, (bank, acc) => ({
  bank,
  acc
}))
