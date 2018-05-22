import fetch from '../util/fetch-fill';
import URI from 'urijs';
import { create } from 'domain';

// /records endpoint
window.path = 'http://localhost:3000/records';

// Your retrieve function plus any additional functions go here ...

function assign(targetObj) {
  for (var i = 1; i < arguments.length; i++) {
    var sourceObj = arguments[i];
    for (var oKey in sourceObj) {
      if (sourceObj.hasOwnProperty(oKey)) {
        targetObj[oKey] = sourceObj[oKey];
      }
    }
  }

  return targetObj;
}

function createQuery({
  page = 1,
  limit = 10,
  colors = ['red', 'brown', 'blue', 'yellow', 'green'],
}) {
  const offset = (page - 1) * limit;

  return `${window.path}?${URI(window.path)
    .search({
      limit,
      offset,
      'color[]': colors,
    })
    .query()
    .replace(/%5B/g, '[')
    .replace(/%5D/g, ']')}`;
}

function isPrimary(color) {
  return color === 'red' || color === 'blue' || color === 'yellow';
}

async function transformData({ data, page = 1, limit = 10 }) {
  const nextPage = await fetch(createQuery({ page: page + 1 }))
    .then(data => data.json())
    .catch(err => {
      console.log(err);
    });

  let prevPage = null;
  if (page > 1) {
    prevPage = await fetch(createQuery({ page: page - 1 }))
      .then(data => data.json())
      .catch(err => {
        console.log(err);
      });
  }

  if (data && data.length > 0) {
    return await {
      ids: data.map(datum => datum.id), // includes all ids of items responded with by the server

      open: data
        .filter(datum => datum.disposition === 'open')
        .map(datum => assign({}, { isPrimary: isPrimary(datum.color) }, datum)),

      closedPrimaryCount: data.filter(
        datum => isPrimary(datum.color) && datum.disposition === 'closed',
      ).length, //  total number of items returned from the request that have a disposition value of "closed" and contain a primary color

      previousPage: page === 1 || page < 1 ? null : page - 1,
      nextPage: nextPage.length === 0 || data.length === 0 ? null : page + 1,
    };
  } else {
    return await {
      ids: [],
      open: [],
      closedPrimaryCount: 0,
      previousPage: prevPage && prevPage.length > 0 ? page - 1 : null,
      nextPage: null,
    };
  }
}

async function retrieve(opts) {
  const page = (opts && opts.page) || 1;
  const colors = (opts && opts.colors) || [
    'red',
    'brown',
    'blue',
    'yellow',
    'green',
  ];

  try {
    const limit = 10;
    const query = createQuery({ page, limit, colors });
    // console.log('QUERY: ', query);
    const response = await fetch(query, {
      method: 'GET',
    });

    if (response.status !== 200) {
      return console.log('Error fetching data');
    }

    let results = await response
      .json()
      .then(async data => {
        return await transformData({ data, page, limit });
      })
      .catch(err => {
        console.log(err);
      });

    return results;
  } catch (err) {
    console.log(err);
  }
}

export default retrieve;
