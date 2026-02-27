import React from 'react'
import CategoryList from '../components/products/CategoryList'
import Topbar from '../components/Topbar'

function CategoriesPage() {
  return (
    <div className="categories">
        <Topbar />
        <CategoryList />
    </div>
  )
}

export default CategoriesPage