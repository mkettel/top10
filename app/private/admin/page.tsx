'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Pencil, 
  Trash2, 
  Plus, 
  X, 
  Save, 
  ChevronDown, 
  ChevronUp,
  AlertTriangle,
  Check,
  Eye,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// Types for the data
interface Category {
  id: string
  name: string
  icon: string
  description: string | null
  created_at?: string
  updated_at?: string
}

interface List {
  id: string
  category_id: string
  title: string
  description: string | null
  source_url: string | null
  reference_info: string | null
  year: number | null
  created_at?: string
  updated_at?: string
}

interface ListItem {
  id: string
  list_id: string
  rank: number
  name: string
  details: string | null
  statistic: string | null
  created_at?: string
  updated_at?: string
}

export default function AdminPage() {
  const router = useRouter()
  const supabase = createClient()
  
  // State for data
  const [categories, setCategories] = useState<Category[]>([])
  const [lists, setLists] = useState<List[]>([])
  const [listItems, setListItems] = useState<ListItem[]>([])
  
  // State for UI
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'categories' | 'lists'>('categories')
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [expandedList, setExpandedList] = useState<string | null>(null)
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null)
  
  // Form state
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingList, setEditingList] = useState<List | null>(null)
  const [editingListItem, setEditingListItem] = useState<ListItem | null>(null)
  const [newCategory, setNewCategory] = useState<Partial<Category>>({ name: '', icon: '🎮', description: '' })
  const [newList, setNewList] = useState<Partial<List>>({ title: '', description: '', source_url: '', reference_info: '' })
  const [newListItem, setNewListItem] = useState<Partial<ListItem>>({ rank: 1, name: '', details: '' })
  const [selectedCategoryForNewList, setSelectedCategoryForNewList] = useState<string | null>(null)
  const [selectedListForNewItem, setSelectedListForNewItem] = useState<string | null>(null)
  
  // Empty list template for creating standard top 10 list
  const generateEmptyListItems = (listId: string) => {
    return Array.from({ length: 10 }, (_, i) => ({
      list_id: listId,
      rank: i + 1,
      name: '',
      details: null,
      statistic: null
    }));
  };

  // Check authentication and load data
  useEffect(() => {
    const checkUserAndLoadData = async () => {
      // Check user
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData?.user) {
        router.push('/login')
        return
      }
      
      setUser(userData.user)
      
      // Load data
      await fetchCategories()
      await fetchLists()
      
      setLoading(false)
    }
    
    checkUserAndLoadData()
  }, [])
  
  // Fetch all categories
  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name')
    
    if (error) {
      showNotification('error', `Error fetching categories: ${error.message}`)
      return
    }
    
    setCategories(data || [])
  }
  
  // Fetch all lists
  const fetchLists = async () => {
    const { data, error } = await supabase
      .from('lists')
      .select('*')
      .order('title')
    
    if (error) {
      showNotification('error', `Error fetching lists: ${error.message}`)
      return
    }
    
    setLists(data || [])
  }
  
  // Fetch list items for a specific list
  const fetchListItems = async (listId: string) => {
    const { data, error } = await supabase
      .from('list_items')
      .select('*')
      .eq('list_id', listId)
      .order('rank')
    
    if (error) {
      showNotification('error', `Error fetching list items: ${error.message}`)
      return
    }
    
    setListItems(prevItems => {
      // Filter out items from this list from the current state
      const filteredItems = prevItems.filter(item => item.list_id !== listId)
      // Add the new items
      return [...filteredItems, ...(data || [])]
    })
    
    return data
  }
  
  // Display notification
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setNotification(null)
    }, 5000)
  }
  
  // ===== CATEGORY OPERATIONS =====
  
  // Create new category
  const createCategory = async () => {
    if (!newCategory.name || !newCategory.icon) {
      showNotification('error', 'Category name and icon are required')
      return
    }
    
    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: newCategory.name,
        icon: newCategory.icon,
        description: newCategory.description || null
      })
      .select()
      .single()
    
    if (error) {
      showNotification('error', `Error creating category: ${error.message}`)
      return
    }
    
    // Update state
    setCategories([...categories, data])
    
    // Reset form
    setNewCategory({ name: '', icon: '🎮', description: '' })
    
    showNotification('success', `Category "${data.name}" created successfully`)
  }
  
  // Update category
  const updateCategory = async () => {
    if (!editingCategory || !editingCategory.name || !editingCategory.icon) {
      showNotification('error', 'Category name and icon are required')
      return
    }
    
    const { data, error } = await supabase
      .from('categories')
      .update({
        name: editingCategory.name,
        icon: editingCategory.icon,
        description: editingCategory.description || null
      })
      .eq('id', editingCategory.id)
      .select()
      .single()
    
    if (error) {
      showNotification('error', `Error updating category: ${error.message}`)
      return
    }
    
    // Update state
    setCategories(categories.map(cat => cat.id === data.id ? data : cat))
    
    // Reset form
    setEditingCategory(null)
    
    showNotification('success', `Category "${data.name}" updated successfully`)
  }
  
  // Delete category
  const deleteCategory = async (category: Category) => {
    if (!confirm(`Are you sure you want to delete the category "${category.name}"? This will also delete all lists in this category!`)) {
      return
    }
    
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', category.id)
    
    if (error) {
      showNotification('error', `Error deleting category: ${error.message}`)
      return
    }
    
    // Update state
    setCategories(categories.filter(cat => cat.id !== category.id))
    
    // Also remove lists in this category
    const categoryLists = lists.filter(list => list.category_id === category.id)
    setLists(lists.filter(list => list.category_id !== category.id))
    
    // And remove list items for those lists
    for (const list of categoryLists) {
      setListItems(listItems.filter(item => item.list_id !== list.id))
    }
    
    showNotification('success', `Category "${category.name}" deleted successfully`)
  }
  
  // ===== LIST OPERATIONS =====
  
  // Create new list
  const createList = async () => {
    if (!newList.title || !selectedCategoryForNewList) {
      showNotification('error', 'List title and category are required')
      return
    }
    
    // Create the list
    const { data, error } = await supabase
      .from('lists')
      .insert({
        category_id: selectedCategoryForNewList,
        title: newList.title,
        description: newList.description || null,
        source_url: newList.source_url || null,
        reference_info: newList.reference_info || null,
        year: newList.year || null
      })
      .select()
      .single()
    
    if (error) {
      showNotification('error', `Error creating list: ${error.message}`)
      return
    }
    
    // Update state
    setLists([...lists, data])
    
    // Create empty list items (top 10)
    const emptyItems = generateEmptyListItems(data.id)
    const { data: itemsData, error: itemsError } = await supabase
      .from('list_items')
      .insert(emptyItems)
      .select()
    
    if (itemsError) {
      showNotification('error', `List created but error adding items: ${itemsError.message}`)
    } else {
      setListItems([...listItems, ...(itemsData || [])])
    }
    
    // Reset form
    setNewList({ title: '', description: '', source_url: '', reference_info: '' })
    setSelectedCategoryForNewList(null)
    
    showNotification('success', `List "${data.title}" created successfully`)
  }
  
  // Update list
  const updateList = async () => {
    if (!editingList || !editingList.title) {
      showNotification('error', 'List title is required')
      return
    }
    
    const { data, error } = await supabase
      .from('lists')
      .update({
        category_id: editingList.category_id,
        title: editingList.title,
        description: editingList.description || null,
        source_url: editingList.source_url || null,
        reference_info: editingList.reference_info || null,
        year: editingList.year || null
      })
      .eq('id', editingList.id)
      .select()
      .single()
    
    if (error) {
      showNotification('error', `Error updating list: ${error.message}`)
      return
    }
    
    // Update state
    setLists(lists.map(list => list.id === data.id ? data : list))
    
    // Reset form
    setEditingList(null)
    
    showNotification('success', `List "${data.title}" updated successfully`)
  }
  
  // Delete list
  const deleteList = async (list: List) => {
    if (!confirm(`Are you sure you want to delete the list "${list.title}"? This will also delete all items in this list!`)) {
      return
    }
    
    const { error } = await supabase
      .from('lists')
      .delete()
      .eq('id', list.id)
    
    if (error) {
      showNotification('error', `Error deleting list: ${error.message}`)
      return
    }
    
    // Update state
    setLists(lists.filter(l => l.id !== list.id))
    
    // Also remove list items
    setListItems(listItems.filter(item => item.list_id !== list.id))
    
    showNotification('success', `List "${list.title}" deleted successfully`)
  }
  
  // ===== LIST ITEM OPERATIONS =====
  
  // Update list item
  const updateListItem = async (item: ListItem) => {
    if (!item.name) {
      showNotification('error', 'Item name is required')
      return
    }
    
    const { data, error } = await supabase
      .from('list_items')
      .update({
        rank: item.rank,
        name: item.name,
        details: item.details || null,
        statistic: item.statistic || null
      })
      .eq('id', item.id)
      .select()
      .single()
    
    if (error) {
      showNotification('error', `Error updating item: ${error.message}`)
      return
    }
    
    // Update state
    setListItems(listItems.map(listItem => listItem.id === data.id ? data : listItem))
    
    showNotification('success', `Item #${data.rank} updated successfully`)
  }
  
  // Save all list items for a list
  const saveAllListItems = async (listId: string) => {
    const itemsToUpdate = listItems.filter(item => item.list_id === listId)
    
    if (itemsToUpdate.some(item => !item.name)) {
      showNotification('error', 'All items must have a name')
      return
    }
    
    let hasError = false
    
    // Update each item individually
    for (const item of itemsToUpdate) {
      const { error } = await supabase
        .from('list_items')
        .update({
          rank: item.rank,
          name: item.name,
          details: item.details || null,
          statistic: item.statistic || null
        })
        .eq('id', item.id)
      
      if (error) {
        showNotification('error', `Error updating item #${item.rank}: ${error.message}`)
        hasError = true
        break
      }
    }
    
    if (!hasError) {
      showNotification('success', 'All items saved successfully')
    }
  }
  
  // Toggle expanded state for category
  const toggleCategoryExpanded = async (categoryId: string) => {
    if (expandedCategory === categoryId) {
      setExpandedCategory(null)
    } else {
      setExpandedCategory(categoryId)
    }
  }
  
  // Toggle expanded state for list
  const toggleListExpanded = async (listId: string) => {
    if (expandedList === listId) {
      setExpandedList(null)
    } else {
      setExpandedList(listId)
      
      // Fetch list items if they're not already loaded
      if (!listItems.some(item => item.list_id === listId)) {
        await fetchListItems(listId)
      }
    }
  }
  
  // Update list item in state (for editing)
  const handleListItemChange = (itemId: string, field: keyof ListItem, value: any) => {
    setListItems(listItems.map(item => {
      if (item.id === itemId) {
        return { ...item, [field]: value }
      }
      return item
    }))
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-new-blue text-offwhite flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-new-blue text-offwhite flex flex-col">
      {/* Header */}
      <header className="p-4 flex justify-between items-center border-b border-white/20">
        <Link href="/private" className="flex items-center gap-2 text-xl font-outfit hover:text-white/90">
          <div className="flex items-center">
            <ArrowLeft size={20} className="mr-2" />
            <h1 className="text-2xl font-bold">Top 10 Game Admin</h1>
          </div>
        </Link>
        
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 rounded-md ${activeTab === 'categories' ? 'bg-white/20' : 'hover:bg-white/10'}`}
          >
            Categories
          </button>
          <button
            onClick={() => setActiveTab('lists')}
            className={`px-4 py-2 rounded-md ${activeTab === 'lists' ? 'bg-white/20' : 'hover:bg-white/10'}`}
          >
            Lists
          </button>
        </div>
      </header>
      
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 p-4 rounded-md shadow-lg z-50 max-w-md ${
          notification.type === 'success' ? 'bg-green-500/90' : 'bg-red-500/90'
        }`}>
          <div className="flex items-start">
            <div className="mr-2 pt-0.5">
              {notification.type === 'success' ? (
                <Check size={18} />
              ) : (
                <AlertTriangle size={18} />
              )}
            </div>
            <div className="flex-1">{notification.message}</div>
            <button 
              onClick={() => setNotification(null)}
              className="ml-4 hover:bg-white/20 p-1 rounded"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
      
      <main className="flex-1 p-4 overflow-auto">
        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Manage Categories</h2>
            
            {/* Add new category form */}
            <div className="bg-white/10 p-6 rounded-md mb-6">
              <h3 className="text-xl font-bold mb-4">Add New Category</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block mb-2 font-medium">Name *</label>
                  <input
                    type="text"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-md text-white"
                    placeholder="Category name"
                  />
                </div>
                
                <div>
                  <label className="block mb-2 font-medium">Icon (Emoji) *</label>
                  <input
                    type="text"
                    value={newCategory.icon}
                    onChange={(e) => setNewCategory({...newCategory, icon: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-md text-white"
                    placeholder="🎮"
                  />
                </div>
                
                <div>
                  <label className="block mb-2 font-medium">Description</label>
                  <input
                    type="text"
                    value={newCategory.description || ''}
                    onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-md text-white"
                    placeholder="Optional description"
                  />
                </div>
              </div>
              
              <button
                onClick={createCategory}
                className="px-6 py-2 bg-white text-new-blue font-medium rounded-md hover:bg-white/90"
              >
                <Plus size={16} className="inline mr-2" />
                Add Category
              </button>
            </div>
            
            {/* Categories list */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold mb-4">Categories ({categories.length})</h3>
              
              {categories.length === 0 ? (
                <div className="bg-white/5 p-6 rounded-md text-center text-white/70">
                  No categories available. Add one using the form above.
                </div>
              ) : (
                <div className="space-y-4">
                  {categories.map(category => (
                    <div key={category.id} className="bg-white/10 rounded-md overflow-hidden">
                      {/* Category header */}
                      <div className="p-4 flex justify-between items-center">
                        <div className="flex items-center">
                          <span className="text-3xl mr-3">{category.icon}</span>
                          <div>
                            <h4 className="text-lg font-bold">{category.name}</h4>
                            {category.description && (
                              <p className="text-sm text-white/70">{category.description}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => toggleCategoryExpanded(category.id)}
                            className="p-2 hover:bg-white/10 rounded-md"
                            aria-label={expandedCategory === category.id ? "Collapse" : "Expand"}
                          >
                            {expandedCategory === category.id ? (
                              <ChevronUp size={20} />
                            ) : (
                              <ChevronDown size={20} />
                            )}
                          </button>
                          
                          <button
                            onClick={() => setEditingCategory(category)}
                            className="p-2 hover:bg-white/10 text-blue-300 rounded-md"
                            aria-label="Edit"
                          >
                            <Pencil size={20} />
                          </button>
                          
                          <button
                            onClick={() => deleteCategory(category)}
                            className="p-2 hover:bg-white/10 text-red-300 rounded-md"
                            aria-label="Delete"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>
                      
                      {/* Lists in this category (when expanded) */}
                      {expandedCategory === category.id && (
                        <div className="border-t border-white/10 p-4">
                          <h5 className="font-medium mb-3">Lists in this category:</h5>
                          
                          {lists.filter(list => list.category_id === category.id).length === 0 ? (
                            <p className="text-white/50 text-sm">No lists in this category</p>
                          ) : (
                            <ul className="space-y-2">
                              {lists
                                .filter(list => list.category_id === category.id)
                                .map(list => (
                                  <li key={list.id} className="bg-white/5 p-3 rounded-md flex justify-between items-center">
                                    <span>{list.title}</span>
                                    <div className="flex space-x-1">
                                      <button
                                        onClick={() => setEditingList(list)}
                                        className="p-1 hover:bg-white/10 text-blue-300 rounded-md"
                                        aria-label="Edit"
                                      >
                                        <Pencil size={16} />
                                      </button>
                                      <button
                                        onClick={() => deleteList(list)}
                                        className="p-1 hover:bg-white/10 text-red-300 rounded-md"
                                        aria-label="Delete"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  </li>
                                ))}
                            </ul>
                          )}
                          
                          <div className="mt-4">
                            <button
                              onClick={() => {
                                setSelectedCategoryForNewList(category.id)
                                setActiveTab('lists')
                              }}
                              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-md text-sm"
                            >
                              <Plus size={14} className="inline mr-1" />
                              Add List to {category.name}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Lists Tab */}
        {activeTab === 'lists' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Manage Lists</h2>
            
            {/* Add new list form */}
            <div className="bg-white/10 p-6 rounded-md mb-6">
              <h3 className="text-xl font-bold mb-4">Add New List</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block mb-2 font-medium">Title *</label>
                  <input
                    type="text"
                    value={newList.title}
                    onChange={(e) => setNewList({...newList, title: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-md text-white"
                    placeholder="List title"
                  />
                </div>
                
                <div>
                  <label className="block mb-2 font-medium">Category *</label>
                  <select
                    value={selectedCategoryForNewList || ''}
                    onChange={(e) => setSelectedCategoryForNewList(e.target.value || null)}
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-md text-white"
                  >
                    <option value="">Select a category</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block mb-2 font-medium">Description</label>
                  <input
                    type="text"
                    value={newList.description || ''}
                    onChange={(e) => setNewList({...newList, description: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-md text-white"
                    placeholder="Optional description"
                  />
                </div>
                
                <div>
                  <label className="block mb-2 font-medium">Source URL</label>
                  <input
                    type="text"
                    value={newList.source_url || ''}
                    onChange={(e) => setNewList({...newList, source_url: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-md text-white"
                    placeholder="https://example.com/source"
                  />
                </div>
                
                <div>
                  <label className="block mb-2 font-medium">Reference Info</label>
                  <input
                    type="text"
                    value={newList.reference_info || ''}
                    onChange={(e) => setNewList({...newList, reference_info: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-md text-white"
                    placeholder="Additional reference information"
                  />
                </div>
                
                <div>
                  <label className="block mb-2 font-medium">Year</label>
                  <input
                    type="number"
                    value={newList.year || ''}
                    onChange={(e) => setNewList({...newList, year: e.target.value ? parseInt(e.target.value) : null})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-md text-white"
                    placeholder="Year (if applicable)"
                  />
                </div>
              </div>
              
              <button
                onClick={createList}
                className="px-6 py-2 bg-white text-new-blue font-medium rounded-md hover:bg-white/90"
              >
                <Plus size={16} className="inline mr-2" />
                Add List (with 10 empty items)
              </button>
            </div>
            
            {/* Lists display */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold mb-4">Lists ({lists.length})</h3>
              
              {lists.length === 0 ? (
                <div className="bg-white/5 p-6 rounded-md text-center text-white/70">
                  No lists available. Add one using the form above.
                </div>
              ) : (
                <div className="space-y-4">
                  {lists.map(list => {
                    const category = categories.find(cat => cat.id === list.category_id)
                    const listItemsList = listItems.filter(item => item.list_id === list.id)
                      .sort((a, b) => a.rank - b.rank)
                    
                    return (
                      <div key={list.id} className="bg-white/10 rounded-md overflow-hidden">
                        {/* List header */}
                        <div className="p-4 flex justify-between items-center">
                          <div>
                            <h4 className="text-lg font-bold flex items-center">
                              {category && (
                                <span className="mr-2">{category.icon}</span>
                              )}
                              {list.title}
                            </h4>
                            {list.description && (
                              <p className="text-sm text-white/70">{list.description}</p>
                            )}
                            {category && (
                              <p className="text-xs text-white/50 mt-1">
                                Category: {category.name}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex space-x-2">
                            <button
                              onClick={() => toggleListExpanded(list.id)}
                              className="p-2 hover:bg-white/10 rounded-md"
                              aria-label={expandedList === list.id ? "Collapse" : "Expand"}
                            >
                              {expandedList === list.id ? (
                                <ChevronUp size={20} />
                              ) : (
                                <ChevronDown size={20} />
                              )}
                            </button>
                            
                            <button
                              onClick={() => setEditingList(list)}
                              className="p-2 hover:bg-white/10 text-blue-300 rounded-md"
                              aria-label="Edit"
                            >
                              <Pencil size={20} />
                            </button>
                            
                            <button
                              onClick={() => deleteList(list)}
                              className="p-2 hover:bg-white/10 text-red-300 rounded-md"
                              aria-label="Delete"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        </div>
                        
                        {/* List details when expanded */}
                        {expandedList === list.id && (
                          <div className="border-t border-white/10">
                            {/* Source info */}
                            {(list.source_url || list.reference_info || list.year) && (
                              <div className="p-4 border-b border-white/10">
                                <h5 className="font-medium mb-2">Source Information:</h5>
                                <div className="space-y-1 text-sm">
                                  {list.source_url && (
                                    <p>
                                      <span className="text-white/70">URL: </span>
                                      <a 
                                        href={list.source_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-300 hover:underline"
                                      >
                                        {list.source_url}
                                      </a>
                                    </p>
                                  )}
                                  {list.reference_info && (
                                    <p>
                                      <span className="text-white/70">Info: </span>
                                      {list.reference_info}
                                    </p>
                                  )}
                                  {list.year && (
                                    <p>
                                      <span className="text-white/70">Year: </span>
                                      {list.year}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* List items */}
                            <div className="p-4">
                              <div className="flex justify-between items-center mb-4">
                                <h5 className="font-medium">List Items:</h5>
                                <button
                                  onClick={() => saveAllListItems(list.id)}
                                  className="px-3 py-1 bg-green-500/20 text-green-300 hover:bg-green-500/30 rounded-md text-sm"
                                >
                                  <Save size={14} className="inline mr-1" />
                                  Save All Changes
                                </button>
                              </div>
                              
                              {listItemsList.length === 0 ? (
                                <div className="text-white/50 text-center py-4">
                                  No items in this list
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {listItemsList.map(item => (
                                    <div key={item.id} className="bg-white/5 p-3 rounded-md">
                                      <div className="flex items-center mb-2">
                                        <div className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-full mr-3 font-bold">
                                          {item.rank}
                                        </div>
                                        <input
                                          type="text"
                                          value={item.name}
                                          onChange={(e) => handleListItemChange(item.id, 'name', e.target.value)}
                                          className="flex-1 px-3 py-1 bg-white/10 border border-white/20 rounded-md text-white"
                                          placeholder={`Item #${item.rank}`}
                                        />
                                      </div>
                                      
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        <div>
                                          <input
                                            type="text"
                                            value={item.details || ''}
                                            onChange={(e) => handleListItemChange(item.id, 'details', e.target.value)}
                                            className="w-full px-3 py-1 bg-white/10 border border-white/20 rounded-md text-white text-sm"
                                            placeholder="Details (optional)"
                                          />
                                        </div>
                                        <div>
                                          <input
                                            type="text"
                                            value={item.statistic || ''}
                                            onChange={(e) => handleListItemChange(item.id, 'statistic', e.target.value)}
                                            className="w-full px-3 py-1 bg-white/10 border border-white/20 rounded-md text-white text-sm"
                                            placeholder="Statistic (optional)"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      
      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-new-blue border border-white/20 rounded-lg max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Edit Category</h3>
              <button 
                onClick={() => setEditingCategory(null)}
                className="hover:bg-white/10 p-2 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block mb-2 font-medium">Name *</label>
                <input
                  type="text"
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({...editingCategory, name: e.target.value})}
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-md text-white"
                  placeholder="Category name"
                />
              </div>
              
              <div>
                <label className="block mb-2 font-medium">Icon (Emoji) *</label>
                <input
                  type="text"
                  value={editingCategory.icon}
                  onChange={(e) => setEditingCategory({...editingCategory, icon: e.target.value})}
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-md text-white"
                  placeholder="🎮"
                />
              </div>
              
              <div>
                <label className="block mb-2 font-medium">Description</label>
                <input
                  type="text"
                  value={editingCategory.description || ''}
                  onChange={(e) => setEditingCategory({...editingCategory, description: e.target.value})}
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-md text-white"
                  placeholder="Optional description"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setEditingCategory(null)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={updateCategory}
                className="px-4 py-2 bg-white text-new-blue font-medium rounded-md hover:bg-white/90"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit List Modal */}
      {editingList && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-new-blue border border-white/20 rounded-lg max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Edit List</h3>
              <button 
                onClick={() => setEditingList(null)}
                className="hover:bg-white/10 p-2 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block mb-2 font-medium">Title *</label>
                <input
                  type="text"
                  value={editingList.title}
                  onChange={(e) => setEditingList({...editingList, title: e.target.value})}
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-md text-white"
                  placeholder="List title"
                />
              </div>
              
              <div>
                <label className="block mb-2 font-medium">Category *</label>
                <select
                  value={editingList.category_id}
                  onChange={(e) => setEditingList({...editingList, category_id: e.target.value})}
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-md text-white"
                >
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block mb-2 font-medium">Description</label>
                <input
                  type="text"
                  value={editingList.description || ''}
                  onChange={(e) => setEditingList({...editingList, description: e.target.value})}
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-md text-white"
                  placeholder="Optional description"
                />
              </div>
              
              <div>
                <label className="block mb-2 font-medium">Source URL</label>
                <input
                  type="text"
                  value={editingList.source_url || ''}
                  onChange={(e) => setEditingList({...editingList, source_url: e.target.value})}
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-md text-white"
                  placeholder="https://example.com/source"
                />
              </div>
              
              <div>
                <label className="block mb-2 font-medium">Reference Info</label>
                <input
                  type="text"
                  value={editingList.reference_info || ''}
                  onChange={(e) => setEditingList({...editingList, reference_info: e.target.value})}
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-md text-white"
                  placeholder="Additional reference information"
                />
              </div>
              
              <div>
                <label className="block mb-2 font-medium">Year</label>
                <input
                  type="number"
                  value={editingList.year || ''}
                  onChange={(e) => setEditingList({...editingList, year: e.target.value ? parseInt(e.target.value) : null})}
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-md text-white"
                  placeholder="Year (if applicable)"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setEditingList(null)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={updateList}
                className="px-4 py-2 bg-white text-new-blue font-medium rounded-md hover:bg-white/90"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}