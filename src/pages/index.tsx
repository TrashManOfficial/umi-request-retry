import styles from './index.less'
import request from '@/utils/request'
import { useState, useEffect } from 'react'

export default function IndexPage() {
  const [data, setData] = useState<{ title: string }>({ title: '' })

  async function getList() {
    const res = await request.get('https://jsonplaceholder.typicode.com/todos/1', {
      retryCount: 2,
      retryInterval: 1,
    })
    setData(res)
  }

  useEffect(() => {
    getList()
  }, [])

  return (
    <div>
      <h1 className={styles.title}>Page index</h1>
      <div>{data?.title}</div>
    </div>
  )
}
