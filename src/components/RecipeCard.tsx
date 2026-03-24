import { ChefHat, CheckCircle2, ShoppingCart } from 'lucide-react';
import { Recipe } from '../types.ts';
import { useTranslation } from 'react-i18next';

interface RecipeCardProps {
  recipe: Recipe;
  onCook: () => void;
  onBring: () => void;
  onBack?: () => void;
  compact?: boolean;
}

export default function RecipeCard({ recipe, onCook, onBring, onBack, compact = false }: RecipeCardProps) {
  const { t } = useTranslation();

  return (
    <div className={`${compact ? '' : 'bg-white rounded-3xl shadow-sm border border-gray-100 p-6'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className={`${compact ? 'text-lg' : 'text-2xl'} font-bold text-gray-900 mb-2`}>{recipe.title}</h2>
          <p className="text-gray-500 text-sm leading-relaxed">{recipe.description}</p>
        </div>
        {!compact && (
          <div className="bg-emerald-100 p-3 rounded-2xl">
            <ChefHat className="text-emerald-600" size={24} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2"></span>
            {t('recipeCard.ingredients')}
          </h3>
          <ul className="space-y-3">
            {recipe.ingredients.map((ing, idx) => (
              <li key={idx} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{ing.amount} {ing.unit} {ing.name}</span>
                {ing.in_inventory ? (
                  <span className="flex items-center text-emerald-600 font-medium text-xs bg-emerald-50 px-2 py-1 rounded-full">
                    <CheckCircle2 size={12} className="mr-1" /> {t('recipeCard.inStock')}
                  </span>
                ) : (
                  <span className="text-red-500 font-medium text-xs bg-red-50 px-2 py-1 rounded-full">{t('recipeCard.missing')}</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2"></span>
            {t('recipeCard.preparation')}
          </h3>
          <ol className="space-y-4">
            {recipe.instructions.map((step, idx) => (
              <li key={idx} className="flex space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center text-xs font-bold">
                  {idx + 1}
                </span>
                <p className="text-sm text-gray-600 leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="flex space-x-3 mt-8">
        {!compact && onBack && (
          <button
            onClick={onBack}
            className="flex-1 py-4 bg-white border border-gray-200 text-gray-700 rounded-2xl font-semibold"
          >
            {t('recipeCard.differentRecipe')}
          </button>
        )}
        <button
          onClick={onBring}
          className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl font-semibold flex items-center justify-center space-x-2 hover:bg-gray-200 transition-colors"
        >
          <ShoppingCart size={20} />
          <span>{t('recipeCard.addMissingToBring')}</span>
        </button>
        <button
          onClick={onCook}
          className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-semibold flex items-center justify-center space-x-2 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100"
        >
          <CheckCircle2 size={20} />
          <span>{t('recipeCard.cookedDeduct')}</span>
        </button>
      </div>
    </div>
  );
}
