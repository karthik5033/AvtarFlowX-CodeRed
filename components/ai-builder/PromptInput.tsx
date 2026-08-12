'use client';

import { useState } from 'react';
import { Send, Loader2, Sparkles, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PromptInputProps {
    onSubmit: (prompt: string) => void;
    isLoading: boolean;
}

type BusinessFieldKey = 'E-Commerce' | 'SaaS / B2B' | 'Healthcare' | 'Education' | 'Real Estate' |
    'Food & Restaurant' | 'Fitness & Wellness' | 'Travel & Hospitality' | 'Finance & Banking' |
    'Automotive' | 'Entertainment & Events' | 'Freelance & Gig Economy' | 'Non-Profit & Community' |
    'Agriculture & Farming' | 'Marketing & Advertising';

// Business fields with 5 prompts each
const businessFields: Record<BusinessFieldKey, { icon: string; prompts: string[] }> = {
    'E-Commerce': {
        icon: '🛒',
        prompts: [
            'Create an online store for selling handmade crafts with product catalog, shopping cart, checkout with payment integration, order tracking, and customer reviews. Include product images, filter by category, wishlist, and admin dashboard for inventory management.',
            'Build a fashion marketplace with vendor accounts, product listings with multiple images, size/color variations, shopping cart, secure checkout, order history, and admin panel for managing vendors and products.',
            'Design a dropshipping platform with AliExpress integration, automated product imports, price markup tools, one-click add to store, order fulfillment automation, and tracking number sync.',
            'Create a subscription box e-commerce site with monthly/quarterly plans, recurring billing, customer portal for plan management, product customization options, and referral program with rewards.',
            'Build a digital products marketplace for selling ebooks, courses, and templates with instant download after purchase, license key generation, customer dashboard, and affiliate program.'
        ]
    },
    'SaaS / B2B': {
        icon: '💼',
        prompts: [
            'Create a project management tool with team workspaces, task boards (Kanban/List views), time tracking, file attachments, team chat, and dashboard with project analytics. Include user roles and permissions.',
            'Build an invoicing platform for freelancers with client management, invoice creation/sending, payment tracking, expense recording, tax calculations, and financial reports. Support multiple currencies.',
            'Design a CRM system with contact management, sales pipeline, deal tracking, email integration, activity logging, reports/analytics, and team collaboration features.',
            'Create a team collaboration platform with chat, video calls, file sharing, project wiki, task assignments, calendar integration, and real-time notifications.',
            'Build a customer support ticket system with multi-channel intake (email, chat, form), ticket assignment, priority levels, knowledge base, canned responses, and SLA tracking.'
        ]
    },
    'Healthcare': {
        icon: '🏥',
        prompts: [
            'Create a telemedicine platform with doctor-patient video consultations, appointment booking, medical history storage, prescription generation, payment processing, and secure chat.',
            'Build a fitness and wellness app with workout plans, nutrition tracking, progress photos, BMI calculator, water intake reminders, and community forum for motivation.',
            'Design a pharmacy management system with inventory tracking, prescription filling, patient records, insurance verification, automated reordering, and sales reports.',
            'Create a mental health support platform with therapist matching, secure messaging, mood tracking journal, meditation guides, crisis resources, and appointment scheduling.',
            'Build a medical appointment booking system for clinics with doctor availability, patient registration, appointment reminders via SMS/email, medical records, and billing integration.'
        ]
    },
    'Education': {
        icon: '📚',
        prompts: [
            'Create an online course platform with video lessons, quizzes, assignments, progress tracking, certificates upon completion, student dashboard, and instructor tools for content creation.',
            'Build a language learning app with interactive lessons, vocabulary flashcards, pronunciation practice, progress tracking, gamification with badges/streaks, and community practice groups.',
            'Design a tutoring marketplace connecting students with tutors, session booking, virtual classroom with whiteboard, homework help chat, payment processing, and review system.',
            'Create a school management system with student enrollment, attendance tracking, grade management, parent portal, fee payment, timetable, and announcement system.',
            'Build an exam preparation platform with practice tests, detailed solutions, performance analytics, weakness identification, personalized study plans, and progress tracking dashboards.'
        ]
    },
    'Real Estate': {
        icon: '🏘️',
        prompts: [
            'Create a property listing website with advanced search filters, interactive map view, virtual tours, mortgage calculator, comparison tool, saved searches, and inquiry forms to agents.',
            'Build a rental management platform for landlords with tenant screening, lease agreements, rent collection, maintenance requests, expense tracking, and property analytics.',
            'Design a real estate CRM for agents with lead management, property matching, automated follow-ups, showing scheduler, contract templates, and commission tracking.',
            'Create a co-living/co-working space booking platform with space availability, amenity listings, booking calendar, member profiles, community events, and payment processing.',
            'Build a property investment analysis tool with ROI calculator, market trend data, cash flow projections, property comparison, and investment portfolio tracking.'
        ]
    },
    'Food & Restaurant': {
        icon: '🍔',
        prompts: [
            'Create a food delivery app with restaurant listings, menu browsing, cart management, real-time order tracking, driver assignment, payment processing, and customer reviews.',
            'Build a restaurant reservation system with table availability, booking calendar, waitlist management, customer preferences, automated confirmation emails, and loyalty program.',
            'Design a recipe sharing platform with user-submitted recipes, ingredient lists, cooking instructions with photos, ratings/reviews, save favorites, meal planning calendar, and shopping list generator.',
            'Create a restaurant management system with table management, POS integration, inventory tracking, employee scheduling, sales reports, and customer feedback collection.',
            'Build a meal prep subscription service with weekly menu selection, dietary preferences, portion customization, delivery scheduling, skip/pause options, and nutrition tracking.'
        ]
    },
    'Fitness & Wellness': {
        icon: '💪',
        prompts: [
            'Create a gym membership platform with class schedules, online booking, trainer profiles, workout logging, progress photos, body measurements tracking, and member check-in system.',
            'Build a personal trainer marketplace with trainer discovery, qualification verification, session booking, workout plans, video form checks, progress tracking, and client messaging.',
            'Design a yoga studio management app with class schedules, instructor management, membership tiers, attendance tracking, workshop registration, and retail product sales.',
            'Create a nutrition coaching platform with meal planning, macro calculator, food diary, recipe database, supplement tracking, weekly check-ins, and progress photos.',
            'Build a meditation and mindfulness app with guided sessions, breathing exercises, sleep stories, mood journaling, streak tracking, and community challenges.'
        ]
    },
    'Travel & Hospitality': {
        icon: '✈️',
        prompts: [
            'Create a hotel booking platform with room search, availability calendar, price comparison, multiple photos, amenities list, booking management, payment processing, and review system.',
            'Build a travel itinerary planner with destination discovery, activity booking, day-by-day scheduling, budget tracking, collaborative planning for groups, and offline access.',
            'Design a vacation rental marketplace like Airbnb with property listings, instant/request booking, host dashboard, guest messaging, calendar sync, payment handling, and review system.',
            'Create a tour guide booking platform with experience listings, guide profiles, availability calendar, group size management, payment processing, and tourist reviews.',
            'Build a travel expense tracker with receipt scanning, currency conversion, category budgets, group expense splitting, expense reports, and remaining budget alerts.'
        ]
    },
    'Finance & Banking': {
        icon: '💰',
        prompts: [
            'Create a personal finance manager with income/expense tracking, budget planning, savings goals, bill reminders, financial insights, account aggregation, and spending reports.',
            'Build a stock portfolio tracker with real-time price updates, performance analytics, profit/loss calculations, dividend tracking, news feed, and watchlist alerts.',
            'Design a peer-to-peer lending platform with borrower applications, credit assessment, investor dashboard, automated payments, loan tracking, and risk analytics.',
            'Create an expense splitting app for roommates/groups with shared expenses, payment tracking, settlement calculations, payment reminders, and expense history.',
            'Build a cryptocurrency exchange with wallet creation, buy/sell orders, price charts, trading history, market trends, portfolio value tracking, and security features.'
        ]
    },
    'Automotive': {
        icon: '🚗',
        prompts: [
            'Create a car rental platform with vehicle search, availability calendar, pricing calculator, booking system, driver verification, insurance options, and pick-up/drop-off location management.',
            'Build a vehicle maintenance tracker with service schedules, repair history, fuel consumption logs, expense tracking, maintenance reminders, and mechanic recommendations.',
            'Design a ride-sharing app with driver-passenger matching, real-time GPS tracking, fare calculator, in-app payments, ratings/reviews, and trip history.',
            'Create an auto parts marketplace with part search by vehicle make/model, compatibility checker, seller ratings, price comparison, order tracking, and warranty management.',
            'Build a parking spot finder with real-time availability, location map, reservation system, pricing tiers, payment processing, and review system.'
        ]
    },
    'Entertainment & Events': {
        icon: '🎭',
        prompts: [
            'Create an event ticketing platform with event creation, ticket tiers, seat selection, QR code generation, payment processing, attendee check-in, and event analytics.',
            'Build a movie/show streaming service with content library, watchlist, personalized recommendations, continue watching, search/filter, user profiles, and subscription management.',
            'Design a concert venue booking system with venue calendar, artist management, ticket sales, seating chart, backstage coordination, vendor management, and revenue reports.',
            'Create a party planning marketplace with vendor directory (caterers, DJs, decorators), booking system, budget tracking, checklists, guest management, and payment coordination.',
            'Build a gaming tournament platform with tournament creation, team registration, bracket generation, match scheduling, score tracking, prize pool management, and leaderboards.'
        ]
    },
    'Freelance & Gig Economy': {
        icon: '🎨',
        prompts: [
            'Create a freelancer marketplace with profile creation, skill showcasing, project bidding, milestone-based payments, time tracking, contract templates, dispute resolution, and review system.',
            'Build a task marketplace like TaskRabbit with service listings, instant booking, location-based matching, pricing calculator, background verification, insurance coverage, and customer reviews.',
            'Design a creative portfolio platform for designers/artists with project showcases, client testimonials, hire me page, quote requests, contract signing, and invoice generation.',
            'Create a virtual assistant hiring platform with VA profiles, skill assessment, trial period option, task management, time tracking, payment automation, and performance reviews.',
            'Build a consulting booking platform with expert profiles, hourly rate display, calendar scheduling, video call integration, session notes, payment processing, and follow-up scheduling.'
        ]
    },
    'Non-Profit & Community': {
        icon: '🤝',
        prompts: [
            'Create a donation platform for charities with campaign creation, donation tracking, recurring donations, donation tiers with rewards, impact metrics, donor dashboard, and tax receipts.',
            'Build a volunteer management system with opportunity listings, volunteer registration, hour tracking, skill matching, event coordination, volunteer recognition, and impact reports.',
            'Design a community forum with discussion boards, user profiles, upvote/downvote system, moderation tools, tags/categories, search functionality, and notification system.',
            'Create a petition platform with petition creation, signature collection, progress tracking, email blasts to supporters, share on social media, and petition delivery to officials.',
            'Build a neighborhood watch app with incident reporting, real-time alerts, community chat, event organization, resource sharing, local business directory, and safety tips.'
        ]
    },
    'Agriculture & Farming': {
        icon: '🌾',
        prompts: [
            'Create a farm management system with crop planning, planting schedules, harvest tracking, inventory management, expense recording, weather integration, and yield analytics.',
            'Build a farmers market marketplace with vendor listings, product catalog, online ordering, delivery/pickup options, seasonal availability, payment processing, and customer reviews.',
            'Design an agricultural equipment rental platform with equipment listings, availability calendar, booking system, pricing calculator, insurance options, delivery coordination, and maintenance tracking.',
            'Create a livestock management app with animal records, breeding tracking, health monitoring, feed schedules, weight tracking, vaccination reminders, and herd analytics.',
            'Build a farm-to-table supply chain platform connecting farmers directly with restaurants, order management, delivery scheduling, pricing tools, quality certifications, and payment processing.'
        ]
    },
    'Marketing & Advertising': {
        icon: '📱',
        prompts: [
            'Create a social media management dashboard with multi-channel posting, content calendar, post scheduling, engagement analytics, hashtag suggestions, competitor tracking, and team collaboration.',
            'Build an email marketing platform with campaign creation, template library, subscriber management, A/B testing, automated workflows, open/click tracking, and analytics dashboard.',
            'Design an influencer marketplace connecting brands with influencers, campaign briefs, application system, content approval workflow, payment processing, performance metrics, and ROI tracking.',
            'Create a landing page builder with drag-drop editor, template library, A/B testing, lead capture forms, integration with email tools, analytics, and conversion tracking.',
            'Build a referral program platform with unique referral links, reward tiers, tracking dashboard, automated payouts, fraud detection, and campaign analytics.'
        ]
    }
};

export default function PromptInput({ onSubmit, isLoading }: PromptInputProps) {
    const [prompt, setPrompt] = useState('');
    const [expandedField, setExpandedField] = useState<BusinessFieldKey | null>(null);

    const handleSubmit = () => {
        if (prompt.trim() && !isLoading) {
            onSubmit(prompt);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            handleSubmit();
        }
    };

    const toggleField = (field: BusinessFieldKey) => {
        setExpandedField(expandedField === field ? null : field);
    };

    const handlePromptSelect = (promptText: string) => {
        setPrompt(promptText);
    };

    return (
        <div className="flex flex-col h-full bg-neutral-50 dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800">
            {/* Header */}
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    AI App Builder
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    Choose your business field
                </p>
            </div>

            {/* Business Fields Accordion */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {(Object.entries(businessFields) as [BusinessFieldKey, typeof businessFields[BusinessFieldKey]][]).map(([field, data]) => (
                    <div key={field} className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden bg-white dark:bg-neutral-800">
                        {/* Field Header - Clickable */}
                        <button
                            onClick={() => toggleField(field)}
                            disabled={isLoading}
                            className="w-full flex items-center justify-between p-3 hover:bg-neutral-50 dark:hover:bg-neutral-750 transition-colors disabled:opacity-50"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-xl">{data.icon}</span>
                                <span className="font-medium text-sm">{field}</span>
                            </div>
                            {expandedField === field ? (
                                <ChevronDown className="w-4 h-4 text-neutral-400" />
                            ) : (
                                <ChevronRight className="w-4 h-4 text-neutral-400" />
                            )}
                        </button>

                        {/* Prompts - Shown when expanded */}
                        {expandedField === field && (
                            <div className="border-t border-neutral-200 dark:border-neutral-700 p-2 space-y-1.5 bg-neutral-50 dark:bg-neutral-900">
                                {data.prompts.map((promptText, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handlePromptSelect(promptText)}
                                        disabled={isLoading}
                                        className="w-full text-left p-2.5 text-xs rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-primary dark:hover:border-primary hover:shadow-sm transition-all disabled:opacity-50 line-clamp-2"
                                    >
                                        {promptText}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Prompt Display & Actions */}
            {prompt && (
                <div className="border-t border-neutral-200 dark:border-neutral-800 p-4 bg-white dark:bg-neutral-800">
                    <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-2 block">Selected Prompt</label>
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 mb-3 text-xs max-h-32 overflow-y-auto">
                        {prompt}
                    </div>

                    <div className="flex gap-2">
                        <Button
                            onClick={handleSubmit}
                            disabled={!prompt.trim() || isLoading}
                            className="flex-1 h-10 bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4 mr-2" />
                                    Generate App
                                </>
                            )}
                        </Button>

                        <Button
                            onClick={() => setPrompt('')}
                            variant="outline"
                            size="icon"
                            className="h-10 w-10"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
