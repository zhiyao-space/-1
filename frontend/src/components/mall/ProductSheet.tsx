import { useEffect, useState } from 'react'
import { Heart, ShoppingCart } from 'lucide-react'
import { discountOf, useMall, type MallProduct } from '../../store/mall'
import { useToast } from '../../store/ui'
import { Price, Sheet, Stepper, Stars, Thumb } from './mallParts'

/* ============================================================
   mulin 商城 ✦ MALLÉ · 商品详情
   ============================================================ */

export default function ProductSheet({
  product,
  onClose,
  onGoCart,
}: {
  product: MallProduct | null
  onClose: () => void
  onGoCart: () => void
}) {
  const addToCart = useMall((s) => s.addToCart)
  const wishlist = useMall((s) => s.user.wishlist)
  const toggleWishlist = useMall((s) => s.toggleWishlist)
  const push = useToast((s) => s.push)
  const [qty, setQty] = useState(1)

  useEffect(() => {
    setQty(1)
  }, [product?.id])

  const liked = product ? wishlist.includes(product.id) : false
  const off = product ? discountOf(product) : null

  return (
    <Sheet open={!!product} onClose={onClose}>
      {product && (
        <>
          <div className="ml-detail__hero">
            <Thumb
              name={product.name}
              image={product.image || undefined}
              size="4 / 3"
              rarity={off ? `${off}折` : undefined}
            />
          </div>
          <div className="ml-detail__name">{product.name}</div>
          <div className="ml-detail__desc">{product.description || '这件商品还没有写描述。'}</div>

          <div className="ml-tagrow" style={{ marginTop: 10 }}>
            {product.tags.map((t) => (
              <span key={t} className="ml-tag">
                {t}
              </span>
            ))}
          </div>

          <div className="ml-detail__price">
            <Price value={product.price} original={product.originalPrice} size={22} />
          </div>

          <div className="ml-detail__grid">
            <div className="ml-detail__cell">
              <b>{product.stock}</b>
              <span>库存</span>
            </div>
            <div className="ml-detail__cell">
              <b>{product.sales}</b>
              <span>销量</span>
            </div>
            <div className="ml-detail__cell">
              <b>{product.rating.toFixed(1)}</b>
              <span>评分</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Stars rating={product.rating} size={13} />
            <span className="ml-meta" style={{ marginLeft: 'auto' }}>
              {product.category || '未分类'}
            </span>
            <span className="ml-bottombar__label">数量</span>
            <Stepper value={qty} onChange={setQty} />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="ml-iconbtn"
              onClick={() => {
                toggleWishlist(product.id)
                push(liked ? '已取消收藏' : '已收藏')
              }}
              aria-label="收藏"
            >
              <Heart size={18} fill={liked ? 'currentColor' : 'none'} color={liked ? '#ff8a8a' : 'currentColor'} />
            </button>
            <button
              className="fx-btn fx-press"
              style={{ flex: 1 }}
              onClick={() => {
                addToCart(product, qty)
                push('已加入购物车')
              }}
            >
              <ShoppingCart size={15} />
              加入购物车
            </button>
            <button
              className="fx-btn fx-btn--accent fx-press"
              style={{ flex: 1 }}
              onClick={() => {
                addToCart(product, qty)
                onClose()
                onGoCart()
              }}
            >
              立即购买
            </button>
          </div>
        </>
      )}
    </Sheet>
  )
}
