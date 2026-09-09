"use client"
import React from 'react'
import TopHeader from '../component/TopHeader'
import CtaSection from '../component/CtaSection'
import IntroVideo from '../component/IntroVideo'
import FeatureSection from '../component/Feature'
import HowItWorks from '@/base-component/HowItWorks'
import TrustCredibility from '../component/TrustCredibility'
import IntegrationsSection from '../component/Intigration'
import PricingSection from '../component/PricingSection'
import FAQSection from '../component/FAQSection'
import ProductScreenshots from '../component/ProductScreenshots'

function HomeView() {
  return (
    <div className='pt-30  max-w-[1340px] mx-auto '>
      <TopHeader/>
      <CtaSection/>
      <IntroVideo/>
      <FeatureSection/>
      <HowItWorks/>
      <TrustCredibility/>
      <IntegrationsSection/>
      <PricingSection/>
      <FAQSection/>
    </div>
  )
}



export default HomeView
