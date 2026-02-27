import React from 'react'
import AttributeList from '../components/products/AttributeList'
import Topbar from '../components/Topbar'

function AttributesPage() {
  return (
    <div className='attributes'>
        <Topbar />
        <AttributeList/>
    </div>
  )
}

export default AttributesPage