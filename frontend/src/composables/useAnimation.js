import { gsap } from 'gsap'

export function useAnimation() {
  const flipBrawlerIn = (element) => {
    gsap.fromTo(element,
      { scale: 0, rotationY: 90, opacity: 0 },
      { scale: 1, rotationY: 0, opacity: 1, duration: 0.6, ease: 'back.out(1.7)' }
    )
  }

  const countdownShake = (element) => {
    gsap.to(element, {
      keyframes: [{ x: -5 }, { x: 5 }, { x: -5 }, { x: 5 }, { x: 0 }],
      duration: 0.5,
      ease: 'power2.inOut',
    })
  }

  const shimmerEffect = (element) => {
    const tl = gsap.timeline({ repeat: -1 })
    tl.fromTo(element,
      { backgroundPosition: '-200% 0' },
      { backgroundPosition: '200% 0', duration: 2, ease: 'none' }
    )
    return tl
  }

  const revealBrawler = (element) => {
    gsap.fromTo(element,
      { scale: 1.3, opacity: 0, filter: 'brightness(3)' },
      { scale: 1, opacity: 1, filter: 'brightness(1)', duration: 0.8, ease: 'power3.out' }
    )
  }

  return { flipBrawlerIn, countdownShake, shimmerEffect, revealBrawler }
}
