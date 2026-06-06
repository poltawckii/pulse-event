import { Router } from 'express'
import pool from '../db/pool.js'
import authMiddleware from '../middleware/auth.js'
import { pickEventImage } from '../utils/kudagoImage.js'

const router = Router()

const SCORE_WEIGHTS = { 5: 10, 4: 6, 3: 1, 2: -4, 1: -10 }
const FAVORITE_WEIGHT = 5
const TAG_SCALE = 0.35 // теги весят 35% от категорий

const CATEGORY_REASONS = {
  concert:          'Вы любите концерты',
  theater:          'Интерес к театру',
  exhibition:       'Интерес к выставкам',
  cinema:           'Любите кино',
  festival:         'Любите фестивали',
  education:        'Интерес к образованию',
  tour:             'Любите экскурсии',
  party:            'Любите вечеринки',
  kids:             'Подходит для детей',
  quest:            'Любите квесты',
  holiday:          'Интерес к праздникам',
  shopping:         'Любите шопинг',
  entertainment:    'Любите развлечения',
  recreation:       'Любите активный отдых',
  photo:            'Интерес к фотографии',
  fashion:          'Интерес к моде',
  'social-activity':'Интерес к благотворительности',
  sport:            'Любите спорт',
  culture:          'Интерес к культуре',
  leisure:          'Любите досуг',
  standup:          'Любите стендап',
  music:            'Любите музыку',
  art:              'Интерес к искусству',
}

// Предпочтения по социальной группе на основе ключевых слов в названии/слаге
function resolveGroupPrefs(groupSlug, groupName) {
  const key = `${groupSlug || ''} ${groupName || ''}`.toLowerCase()

  if (/пенсион|пожил|senior|elderly|veteran|ветеран/.test(key)) {
    return {
      boostPatterns: ['классик', 'ретро', '80-е', '90-е', '70-е', 'советск', 'хоровой', 'академич', 'симфон', 'романс', 'народн', 'хит'],
      avoidPatterns: ['молодеж', 'клуб', 'рейв', 'техно', 'хип-хоп', 'хип хоп', 'рэп', 'рэперск', 'drum', 'dj', 'диджей', '18+', '21+'],
    }
  }
  if (/семья|семей|family|дет|ребёнк|ребенок|child|kids/.test(key)) {
    return {
      boostPatterns: ['семейн', 'дети', 'детск', 'малыш', 'мультфильм', 'сказк', 'кукольн', 'для детей'],
      avoidPatterns: ['18+', '21+', 'ночной', 'стриптиз'],
    }
  }
  if (/молодеж|студент|youth|student/.test(key)) {
    return {
      boostPatterns: ['молодеж', 'студент', 'клуб', 'вечеринк', 'хип', 'рэп', 'рок', 'инди'],
      avoidPatterns: ['пенсион', 'пожил', 'ветеран', 'советск'],
    }
  }
  return null
}

function tagMatchesPatterns(tag, patterns) {
  const t = tag.toLowerCase()
  return patterns.some((p) => t.includes(p))
}

router.get('/', authMiddleware, async (req, res) => {
  const { lat, lng, radius = '5000', location = 'msk', basis = 'ratings' } = req.query

  try {
    const [localRatings, localFavorites, externalRatings, externalFavorites, userRow] =
      await Promise.all([
        pool.query(
          `SELECT c.slug, r.score
           FROM ratings r
           JOIN events e ON e.id = r.event_id
           JOIN categories c ON c.id = e.category_id
           WHERE r.user_id = $1`,
          [req.user.id]
        ),
        pool.query(
          `SELECT c.slug
           FROM favorites f
           JOIN events e ON e.id = f.event_id
           JOIN categories c ON c.id = e.category_id
           WHERE f.user_id = $1`,
          [req.user.id]
        ),
        pool.query(
          `SELECT unnest(categories) AS slug, score, external_id, tags
           FROM ratings_external
           WHERE user_id = $1 AND categories IS NOT NULL`,
          [req.user.id]
        ),
        pool.query(
          `SELECT unnest(categories) AS slug, external_id, tags
           FROM favorites_external
           WHERE user_id = $1 AND categories IS NOT NULL`,
          [req.user.id]
        ),
        pool.query(
          `SELECT u.social_group_id, sg.slug AS group_slug, sg.name AS group_name
           FROM users u
           LEFT JOIN social_groups sg ON sg.id = u.social_group_id
           WHERE u.id = $1`,
          [req.user.id]
        ),
      ])

    // ── Категорийные веса ──────────────────────────────────────────────────
    const weights = new Map()
    const addWeight = (slug, value) => {
      if (!slug || typeof slug !== 'string') return
      weights.set(slug, (weights.get(slug) || 0) + value)
    }

    const useFavorites = basis === 'favorites'
    const useRatings = basis !== 'favorites'

    if (useRatings) {
      localRatings.rows.forEach(({ slug, score }) =>
        addWeight(slug, SCORE_WEIGHTS[Number(score)] ?? 0)
      )
      externalRatings.rows.forEach(({ slug, score }) =>
        addWeight(slug, SCORE_WEIGHTS[Number(score)] ?? 0)
      )
    }

    if (useFavorites) {
      localFavorites.rows.forEach(({ slug }) => addWeight(slug, FAVORITE_WEIGHT))
      externalFavorites.rows.forEach(({ slug }) => addWeight(slug, FAVORITE_WEIGHT))
    }

    // ── Тег-веса из истории оценок ─────────────────────────────────────────
    const tagWeights = new Map()
    const addTagWeight = (tag, value) => {
      if (!tag || typeof tag !== 'string') return
      tagWeights.set(tag, (tagWeights.get(tag) || 0) + value * TAG_SCALE)
    }

    if (useRatings) {
      // externalRatings содержит по одной строке на категорию (unnest), тег-массив повторяется
      // Собираем уникальные пары external_id+score чтобы не дублировать
      const seenRatingIds = new Set()
      externalRatings.rows.forEach(({ external_id, score, tags }) => {
        if (seenRatingIds.has(external_id)) return
        seenRatingIds.add(external_id)
        if (Array.isArray(tags)) {
          tags.forEach((tag) => addTagWeight(tag, SCORE_WEIGHTS[Number(score)] ?? 0))
        }
      })
    }

    if (useFavorites) {
      const seenFavIds = new Set()
      externalFavorites.rows.forEach(({ external_id, tags }) => {
        if (seenFavIds.has(external_id)) return
        seenFavIds.add(external_id)
        if (Array.isArray(tags)) {
          tags.forEach((tag) => addTagWeight(tag, FAVORITE_WEIGHT))
        }
      })
    }

    // ── Social-group boost/avoid ───────────────────────────────────────────
    const { group_slug, group_name } = userRow.rows[0] || {}
    const groupPrefs = resolveGroupPrefs(group_slug, group_name)

    // ── Нелюбимые категории ────────────────────────────────────────────────
    const dislikedSlugs = new Set(
      [...weights.entries()].filter(([, w]) => w < -5).map(([slug]) => slug)
    )

    const positiveEntries = [...weights.entries()]
      .filter(([, w]) => w > 0)
      .sort((a, b) => b[1] - a[1])

    let topCategories = positiveEntries.slice(0, 5).map(([slug]) => slug)

    // Fallback: нет категорий — учимся по event_ids
    if (!topCategories.length) {
      const idResult = await pool.query(
        useFavorites
          ? `SELECT DISTINCT external_id FROM favorites_external WHERE user_id = $1 LIMIT 20`
          : `SELECT DISTINCT external_id FROM ratings_external WHERE user_id = $1 LIMIT 20`,
        [req.user.id]
      )

      const externalIds = idResult.rows.map((row) => row.external_id)
      if (!externalIds.length) {
        return res.json({ data: [], insights: null })
      }

      const detailsParams = new URLSearchParams({
        ids: externalIds.join(','),
        fields: 'id,title,place,price,site_url,categories,images',
        expand: 'place,images',
      })
      const detailsResponse = await fetch(
        `https://kudago.com/public-api/v1.4/events/?${detailsParams}`
      )
      if (!detailsResponse.ok) {
        return res.status(502).json({ error: 'Failed to load KudaGo details' })
      }

      const detailsPayload = await detailsResponse.json()
      const detailEvents = detailsPayload?.results || []

      await Promise.all(
        detailEvents.map((event) => {
          const categories = Array.isArray(event.categories) ? event.categories : null
          if (!categories?.length) return Promise.resolve()
          return Promise.all([
            pool.query(
              `UPDATE ratings_external SET categories = $1
               WHERE user_id = $2 AND external_id = $3 AND categories IS NULL`,
              [categories, req.user.id, String(event.id)]
            ),
            pool.query(
              `UPDATE favorites_external SET categories = $1
               WHERE user_id = $2 AND external_id = $3 AND categories IS NULL`,
              [categories, req.user.id, String(event.id)]
            ),
          ])
        })
      )

      detailEvents.forEach((event) => {
        if (Array.isArray(event.categories)) {
          event.categories.forEach((cat) => addWeight(cat, 1))
        }
      })

      topCategories = [...weights.entries()]
        .filter(([, w]) => w > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([slug]) => slug)

      if (!topCategories.length) return res.json({ data: [], insights: null })
    }

    // ── Запрос к KudaGo ────────────────────────────────────────────────────
    const mskOffsetMs = 3 * 60 * 60 * 1000
    const nowMskSeconds = Math.floor((Date.now() + mskOffsetMs) / 1000)

    const params = new URLSearchParams({
      location,
      page_size: '60',
      actual_since: String(nowMskSeconds),
      categories: topCategories.join(','),
      fields: 'id,title,dates,place,price,site_url,categories,tags,images',
      expand: 'place,images',
    })
    if (lat && lng) {
      params.set('lat', String(lat))
      params.set('lon', String(lng))
      params.set('radius', String(radius))
    }

    const response = await fetch(`https://kudago.com/public-api/v1.4/events/?${params}`)
    if (!response.ok) {
      return res.status(502).json({ error: 'Failed to load KudaGo recommendations' })
    }

    const payload = await response.json()

    const excludeIds = new Set(
      useFavorites
        ? externalFavorites.rows.map((r) => String(r.external_id))
        : externalRatings.rows.map((r) => String(r.external_id))
    )

    // ── Скоринг событий ────────────────────────────────────────────────────
    const scored = (payload?.results || [])
      .filter((event) => !excludeIds.has(String(event.id)))
      .map((event) => {
        const cats = event.categories || []
        const eventTags = event.tags || []

        // Категорийный вес
        const catScore = cats.reduce((sum, cat) => sum + (weights.get(cat) || 0), 0)

        // Тег-вес из истории
        const tagScore = eventTags.reduce((sum, tag) => sum + (tagWeights.get(tag) || 0), 0)

        // Social-group boost/avoid
        let groupScore = 0
        if (groupPrefs && eventTags.length) {
          const hasBoost = eventTags.some((t) => tagMatchesPatterns(t, groupPrefs.boostPatterns))
          const hasAvoid = eventTags.some((t) => tagMatchesPatterns(t, groupPrefs.avoidPatterns))
          if (hasBoost) groupScore += 8
          if (hasAvoid) groupScore -= 12
        }

        const relevanceScore = catScore + tagScore + groupScore

        // Пропускаем события только с нелюбимыми категориями
        const hasGoodCat = cats.some((c) => !dislikedSlugs.has(c))
        if (!hasGoodCat && cats.length > 0) return null

        // Пропускаем события, которые social-group активно отвергает
        if (groupScore < -6 && catScore <= 0) return null

        // Лучшая категория для подписи
        const bestCat = cats
          .filter((c) => (weights.get(c) || 0) > 0)
          .sort((a, b) => (weights.get(b) || 0) - (weights.get(a) || 0))[0]

        const reason = bestCat
          ? (CATEGORY_REASONS[bestCat] || 'Совпадает с вашими интересами')
          : 'Может понравиться'

        return {
          source: 'kudago',
          id: event.id,
          title: event.title,
          dates: event.dates,
          price: event.price,
          url: event.site_url,
          categories: cats,
          tags: eventTags,
          place: event.place?.title || null,
          image: pickEventImage(event),
          reason,
          _score: relevanceScore,
        }
      })
      .filter(Boolean)
      .sort((a, b) => b._score - a._score)

    // Диверсификация: не более 3 событий на категорию
    const catCount = new Map()
    const MAX_PER_CAT = 3
    const diversified = []

    for (const event of scored) {
      const primaryCat =
        event.categories.find((c) => topCategories.includes(c)) || '__other'
      const count = catCount.get(primaryCat) || 0
      if (count < MAX_PER_CAT) {
        catCount.set(primaryCat, count + 1)
        diversified.push(event)
      }
      if (diversified.length >= 30) break
    }

    const insights = {
      topCategories: positiveEntries.slice(0, 5).map(([slug, weight]) => ({
        slug,
        weight: Math.round(weight),
      })),
      dislikedCategories: [...dislikedSlugs].slice(0, 3),
      totalRated: externalRatings.rows.length + localRatings.rows.length,
      totalFavorited: externalFavorites.rows.length + localFavorites.rows.length,
    }

    const data = diversified.map(({ _score, ...event }) => event)
    return res.json({ data, insights })
  } catch (error) {
    console.error('Recommendations error:', error)
    return res.status(500).json({ error: 'Failed to load recommendations' })
  }
})

export default router
