import React from 'react'
import '../../assets/styles/SettingsHeading.scss'

function SettingsHeading({heading}) {
  return (
    <div className="settings-heading">
        <h4>{heading}</h4>
    </div>
  )
}

export default SettingsHeading