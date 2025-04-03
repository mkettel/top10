// /app/private/admin/scrape-lists/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Download, Upload, RefreshCw, Check, AlertTriangle } from 'lucide-react'

interface Category {
  id: string;
  name: string;
}

interface ListItem {
  id: string;
  list_id: string;
  name: string;
  details?: string;
  rank: number;
}

interface List {
  id: string;
  title: string;
  source_url: string;
  categories: {
    id: string;
    name: string;
  };
  has_items: Array<{ count: number }>;
  // Derived fields
  category?: string;
  itemCount?: number;
}

interface ImportResult {
  success: boolean;
  message: string;
}

interface ConfigDataItem {
  id: string;
  title: string;
  source_url: string;
  category: string;
  has_items: boolean;
}

export default function ScrapeListsPage() {
  const [lists, setLists] = useState<List[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [categories, setCategories] = useState<Category[]>([])
  const [importingItems, setImportingItems] = useState<boolean>(false)
  const [importResults, setImportResults] = useState<ImportResult | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchLists()
    fetchCategories()
  }, [])

  useEffect(() => {
    fetchLists()
  }, [selectedCategory])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('name')
      
      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchLists = async () => {
    setIsLoading(true)
    try {
      let query = supabase
        .from('lists')
        .select(`
          id, 
          title, 
          source_url, 
          categories(id, name),
          has_items:list_items(count)
        `)
        .order('title')
      
      if (selectedCategory !== 'all') {
        query = query.eq('category_id', selectedCategory)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      
      // Format the data
      const formattedLists = data.map(list => ({
        id: list.id,
        title: list.title,
        source_url: list.source_url,
        categories: Array.isArray(list.categories) ? list.categories[0] : list.categories,
        has_items: list.has_items,
        category: Array.isArray(list.categories) ? (list.categories[0] as { id: string; name: string })?.name : (list.categories as { id: string; name: string })?.name,
        itemCount: list.has_items?.[0]?.count || 0
      }))
      
      setLists(formattedLists)
    } catch (error) {
      console.error('Error fetching lists:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const exportScrapeConfig = () => {
    const configData: ConfigDataItem[] = lists.map(list => ({
      id: list.id,
      title: list.title,
      source_url: list.source_url,
      category: list.category || '',
      has_items: (list.itemCount || 0) > 0
    }))
    
    const blob = new Blob([JSON.stringify(configData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'scrape_config.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const importListItems = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return
    
    const file = files[0]
    setImportingItems(true)
    setImportResults(null)
    
    try {
      const reader = new FileReader()
      
      reader.onload = async (e: ProgressEvent<FileReader>) => {
        try {
          if (!e.target?.result) {
            throw new Error('Failed to read file')
          }
          
          const jsonData = JSON.parse(e.target.result as string) as ListItem[]
          
          // Simple validation
          if (!Array.isArray(jsonData)) {
            setImportResults({
              success: false,
              message: 'Invalid file format. Expected an array of list items.'
            })
            return
          }
          
          // Group items by list_id for progress tracking
          const listGroups: Record<string, ListItem[]> = {}
          jsonData.forEach(item => {
            if (!listGroups[item.list_id]) {
              listGroups[item.list_id] = []
            }
            listGroups[item.list_id].push(item)
          })
          
          // Process each list one by one
          let successCount = 0
          let errorCount = 0
          
          for (const [listId, items] of Object.entries(listGroups)) {
            try {
              // First, check if the list already has items
              const { data: existingItems } = await supabase
                .from('list_items')
                .select('id')
                .eq('list_id', listId)
              
              // If items exist, delete them first
              if (existingItems && existingItems.length > 0) {
                await supabase
                  .from('list_items')
                  .delete()
                  .eq('list_id', listId)
              }
              
              // Insert new items
              const { error } = await supabase
                .from('list_items')
                .insert(items)
              
              if (error) {
                console.error(`Error importing items for list ${listId}:`, error)
                errorCount++
              } else {
                successCount++
              }
            } catch (error) {
              console.error(`Error processing list ${listId}:`, error)
              errorCount++
            }
          }
          
          setImportResults({
            success: errorCount === 0,
            message: `Imported items for ${successCount} lists with ${errorCount} errors.`
          })
          
          // Refresh lists to update item counts
          fetchLists()
        } catch (error) {
          console.error('Error parsing JSON:', error)
          setImportResults({
            success: false,
            message: 'Error parsing JSON file. Please check the file format.'
          })
        }
      }
      
      reader.readAsText(file)
    } catch (error: any) {
      console.error('Error during import:', error)
      setImportResults({
        success: false,
        message: `Error during import: ${error.message}`
      })
    } finally {
      setImportingItems(false)
    }
  }

  return (
    <div className="min-h-screen bg-new-blue text-offwhite flex flex-col">
      <header className="p-4 border-b border-white/20 flex items-center">
        <Link href="/private/admin" className="p-2 rounded-full hover:bg-white/10 mr-3">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold">List Scraper</h1>
      </header>

      <main className="flex-1 p-4 max-w-4xl mx-auto w-full">
        <div className="bg-white/5 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-bold mb-2">Top 10 List Scraper</h2>
          
          <div className="mt-4 p-4 bg-white/10 rounded-lg">
            <h3 className="font-semibold mb-3">How to Use This Tool:</h3>
            <ol className="list-decimal pl-5 space-y-2 text-white/80">
              <li>Export the scrape configuration file using the button below</li>
              <li>Run the <code className="px-1 py-0.5 bg-white/20 rounded">top10_scraper.py</code> script with the exported config file</li>
              <li>Upload the resulting JSON file using the "Import List Items" button</li>
            </ol>
            
            <div className="mt-4 p-3 bg-yellow-500/20 text-yellow-100 rounded">
              <div className="flex items-start">
                <AlertTriangle className="mt-0.5 mr-2 flex-shrink-0" size={18} />
                <div>
                  <p className="font-semibold">Note:</p>
                  <p className="text-sm">The scraping process may take several minutes per list. Running the Python script locally allows you to monitor progress and avoid timeouts that might occur in a web environment.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-white/70 mb-1">Category Filter</label>
              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-white/10 border border-white/20 text-white rounded-md px-3 py-2"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex-1"></div>
            
            <div className="flex gap-3">
              <button
                onClick={exportScrapeConfig}
                className="flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 rounded-md"
              >
                <Download size={18} className="mr-2" />
                Export Scrape Config
              </button>
              
              <div className="relative">
                <button
                  onClick={() => document.getElementById('fileInput')?.click()}
                  disabled={importingItems}
                  className={`flex items-center px-4 py-2 rounded-md ${
                    importingItems 
                      ? 'bg-white/5 cursor-not-allowed' 
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {importingItems ? (
                    <>
                      <RefreshCw size={18} className="mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload size={18} className="mr-2" />
                      Import List Items
                    </>
                  )}
                </button>
                <input 
                  id="fileInput"
                  type="file"
                  accept=".json"
                  onChange={importListItems}
                  disabled={importingItems}
                  className="hidden"
                />
              </div>
              
              <button
                onClick={fetchLists}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-md"
              >
                <RefreshCw size={18} />
              </button>
            </div>
          </div>
          
          {importResults && (
            <div className={`p-4 rounded-lg ${
              importResults.success 
                ? 'bg-green-500/20 text-green-100' 
                : 'bg-red-500/20 text-red-100'
            }`}>
              <div className="flex items-center">
                {importResults.success ? (
                  <Check size={18} className="mr-2" />
                ) : (
                  <AlertTriangle size={18} className="mr-2" />
                )}
                <p>{importResults.message}</p>
              </div>
            </div>
          )}
          
          <div className="bg-white/5 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-white/10">
                <tr>
                  <th className="text-left p-3">Title</th>
                  <th className="text-left p-3">Category</th>
                  <th className="text-left p-3">Items</th>
                  <th className="text-left p-3">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center">Loading lists...</td>
                  </tr>
                ) : lists.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center">No lists found</td>
                  </tr>
                ) : (
                  lists.map(list => (
                    <tr key={list.id} className="hover:bg-white/5">
                      <td className="p-3">{list.title}</td>
                      <td className="p-3">{list.category}</td>
                      <td className="p-3">
                        {(list.itemCount || 0) > 0 ? (
                          <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded-full text-xs">
                            {list.itemCount} items
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-xs">
                            No items
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <a 
                          href={list.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-300 hover:text-blue-200 text-sm flex items-center"
                        >
                          Source Link
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}