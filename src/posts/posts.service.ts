import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { Post } from './entities/post.entity';
import { User, UserRole } from 'src/auth/entities/user.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { FindPostsQueryDto } from './dto/find-posts-query.dto';
import { Paginatedresponse } from 'src/common/interfaces/paginated-response.interface';

@Injectable()
export class PostsService {
  private postListCachekeys: Set<string> = new Set();

  constructor(
    @InjectRepository(Post) private postRepository: Repository<Post>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private generatePostListCachekey(query: FindPostsQueryDto): string {
    const { page = 1, limit = 10, title } = query;
    return `posts_list_page${page}_limit${limit}_title${title || 'all'}`;
  }

  async findAll(query: FindPostsQueryDto): Promise<Paginatedresponse<Post>> {
    const cacheKey = this.generatePostListCachekey(query);
    this.postListCachekeys.add(cacheKey);

    const getCachedData = await this.cacheManager.get<Paginatedresponse<Post>>(cacheKey);

    if (getCachedData) {
      console.log(`Cache hit ---------> Returning post list from cache ${cacheKey}`);
      return getCachedData;
    }
    console.log(`Cache miss ---------> Returning post list from database`);
    const { page = 1, limit = 10, title } = query;
    const skip = (page - 1) * limit;
    const queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.authorName', 'authorName')
      .orderBy('post.createdAt', 'DESC')
      .skip(skip)
      .limit(limit);

    if (title) {
      queryBuilder.andWhere('post.title ILIKE :title', { title: `%${title}%` });
    }

    const [items, totalItems] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(totalItems / limit);

    const responseResult = {
      items,
      meta: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems: totalItems,
        totalPages: totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
      },
    };

    await this.cacheManager.set(cacheKey, responseResult, 30000);
    return responseResult;
  }

  async findOne(id: number): Promise<Post> {
    const cacheKey = `post_${id}`;
    const cachedPost = await this.cacheManager.get<Post>(cacheKey);

    if (cachedPost) {
      console.log(`Cache hit ---------> Returning post from cache ${cacheKey}`);
      return cachedPost;
    }
    console.log(`Cache miss ---------> Returning post from database`);

    const singlePost = await this.postRepository.findOne({
      where: { id },
      relations: ['authorName'],
    });
    if (!singlePost) {
      throw new NotFoundException(`Post with id ${id} not found`);
    }
    await this.cacheManager.set(cacheKey, singlePost, 30000);
    return singlePost;
  }

  async create(post: CreatePostDto, authorName: User): Promise<Post> {
    const newPost = this.postRepository.create({
      title: post.title,
      content: post.content,
      authorName,
    });

    await this.invalidateAllExistingListCaches();

    return this.postRepository.save(newPost);
  }

  async update(id: number, postData: UpdatePostDto, user: User): Promise<Post> {
    const findPostToUpdate = await this.findOne(id);
    if (findPostToUpdate.authorName.id !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You are not admin or not the author of this post.');
    }
    findPostToUpdate.title = postData.title ?? findPostToUpdate.title;
    findPostToUpdate.content = postData.content ?? findPostToUpdate.content;

    const updatedOPost = await this.postRepository.save(findPostToUpdate);

    await this.cacheManager.del(`post_${updatedOPost.id}`);

    await this.invalidateAllExistingListCaches();

    return updatedOPost;
  }

  async remove(id: number, user: User): Promise<void> {
    const findPostToRemove = await this.findOne(id);

    if (findPostToRemove.authorName.id !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You are not admin or not the author of this post.');
    }

    await this.cacheManager.del(`post_${id}`);

    await this.invalidateAllExistingListCaches();

    await this.postRepository.delete(findPostToRemove);
  }

  private async invalidateAllExistingListCaches(): Promise<void> {
    console.log(`Invalidating ${this.postListCachekeys.size} list cache entries`);

    for (const key of this.postListCachekeys) {
      await this.cacheManager.del(key);
    }

    this.postListCachekeys.clear();
  }
}
