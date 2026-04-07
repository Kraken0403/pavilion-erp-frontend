import React from 'react'
import Topbar from '../components/Topbar'
import CouponList from '../components/coupons/CouponList'

function CouponsPage() {
  return (
    <div className='coupons-page'>
      <Topbar />
      <CouponList />
    </div>
  )
}

export default CouponsPage
