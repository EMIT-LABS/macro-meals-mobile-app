import React from 'react'
import { IMAGE_CONSTANTS } from 'src/constants/imageConstants'

function getMealIcons(meal: any) {
  return (  meal === 'manual'
   ? IMAGE_CONSTANTS.fireIcon
   : meal ===
       'barcode'
      ? IMAGE_CONSTANTS.scanBarcodeIcon
    : meal ===
      'scanned'
    ? IMAGE_CONSTANTS.scanMealIcon
   : meal === 'ai_recipe'
   ? IMAGE_CONSTANTS.aiRecipeIcon
    :meal === 'search'
    ? IMAGE_CONSTANTS.loggingSearchIcon
    :meal === 'meal_finder'
    ? IMAGE_CONSTANTS.mealFinderIcon
      : IMAGE_CONSTANTS.fireIcon 
  )
}

export default getMealIcons