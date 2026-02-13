import React from 'react'
import { IMAGE_CONSTANTS } from 'src/constants/imageConstants'

function getMealIcons(meal: any) {
    switch (meal) {
    case 'manual':
      return IMAGE_CONSTANTS.fireIcon;

    case 'barcode':
      return IMAGE_CONSTANTS.scanBarcodeIcon;

    case 'scanned':
      return IMAGE_CONSTANTS.scanMealIcon;

    case 'ai_recipe':
      return IMAGE_CONSTANTS.aiRecipeIcon;

    case 'search':
      return IMAGE_CONSTANTS.loggingSearchIcon;

    case 'meal_finder':
      return IMAGE_CONSTANTS.mealFinderIcon;

    default:
      return IMAGE_CONSTANTS.fireIcon;
    }
  
}

export default getMealIcons