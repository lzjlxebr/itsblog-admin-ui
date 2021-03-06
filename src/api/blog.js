import request from '@/utils/request'

export function getList(params) {
  return request({
    url: '/blog/list',
    method: 'get',
    params
  })
}

export function findById(params) {
  return request({
    url: '/blog/find-by-id',
    method: 'get',
    params
  })
}

export function createBlog(data) {
  return request({
    url: '/blog/insert',
    method: 'post',
    data
  })
}

export function updateBlogInfo(data) {
  return request({
    url: '/blog//info-update',
    method: 'post',
    data
  })
}

export function archiveBlog(data) {
  return request({
    url: '/blog//archive',
    method: 'post',
    data
  })
}

export function updateBlog(data) {
  return request({
    url: '/blog/update',
    method: 'post',
    data
  })
}

export function publishBlog(data) {
  return request({
    url: '/blog/publish',
    method: 'post',
    data
  })
}

export function deleteBlog(data) {
  return request({
    url: '/blog/delete',
    method: 'post',
    data
  })
}

export function destroyBlog(data) {
  return request({
    url: '/blog/destroy',
    method: 'post',
    data
  })
}
